"""
WebSocket progress broker.

Each job_id has a broadcast queue. The background worker publishes
JobProgressEvent objects; the WS endpoint drains and forwards them to clients.
"""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.schemas import JobProgressEvent

logger = logging.getLogger(__name__)
router = APIRouter()

# job_id -> set of queues
_subscribers: dict[UUID, set[asyncio.Queue[Any]]] = defaultdict(set)
_lock = asyncio.Lock()


async def publish(event: JobProgressEvent) -> None:
    """Publish a progress event to all subscribers for a job."""

    async with _lock:
        queues = list(_subscribers.get(event.job_id, ()))
    for q in queues:
        # drop if a subscriber is too slow
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            logger.warning("Subscriber queue full for job %s; dropping event", event.job_id)


async def _subscribe(job_id: UUID) -> asyncio.Queue[Any]:
    q: asyncio.Queue[Any] = asyncio.Queue(maxsize=32)
    async with _lock:
        _subscribers[job_id].add(q)
    return q


async def _unsubscribe(job_id: UUID, q: asyncio.Queue[Any]) -> None:
    async with _lock:
        _subscribers[job_id].discard(q)
        if not _subscribers[job_id]:
            _subscribers.pop(job_id, None)


@router.websocket("/ws/jobs/{job_id}")
async def ws_job_progress(websocket: WebSocket, job_id: UUID) -> None:
    await websocket.accept()
    q = await _subscribe(job_id)
    try:
        while True:
            event: JobProgressEvent = await q.get()
            await websocket.send_json(event.model_dump(mode="json"))
            if event.status in {"completed", "failed"}:
                break
    except WebSocketDisconnect:
        pass
    finally:
        await _unsubscribe(job_id, q)
        try:
            await websocket.close()
        except Exception:
            pass
