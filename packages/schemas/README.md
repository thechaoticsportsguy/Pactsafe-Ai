# packages/schemas

Single source of truth for the `AnalysisResult` JSON shape.

- **Python** (`python/`): re-exports the authoritative Pydantic models from
  `apps/api/app/schemas.py`. The backend imports from there directly; this
  folder just re-exports for anything else that needs them.
- **TypeScript** (`typescript/`): generated types used by `apps/web`.

## Regenerating TypeScript types

From the repo root, with the API running (or just with `schemas.py` importable):

```bash
# 1. Dump the OpenAPI JSON
curl -s http://localhost:8000/openapi.json > packages/schemas/openapi.json

# 2. Generate TS types (example using openapi-typescript)
npx openapi-typescript packages/schemas/openapi.json -o packages/schemas/typescript/api.d.ts
```

The `AnalysisResult` type in `packages/schemas/typescript/index.ts` mirrors
`apps/api/app/schemas.py::AnalysisResult` and is kept in sync by hand for now.
