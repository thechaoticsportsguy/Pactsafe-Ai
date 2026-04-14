# ---- PactSafe API ----
FROM python:3.11-slim

# System deps for pdfplumber (cairo/poppler) and pytesseract (OCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        poppler-utils \
        tesseract-ocr \
        libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first (cache layer)
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e ".[dev]"

# Copy source
COPY . .

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UPLOAD_DIR=/app/uploads

RUN mkdir -p /app/uploads

EXPOSE 8000

# Run migrations then start the server
CMD ["sh", "-c", "mkdir -p /data/uploads && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
