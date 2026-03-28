# CSlate Server API Contract Reference

**Version:** 3.0
**Source of truth:** CSlate-Server repo docs

This file summarizes the portions of the server API contract that are directly
implemented as Zod schemas in `@cslate/shared`.

## Authentication

```
Authorization: ApiKey <api_key>

POST   /api/v1/auth/register       → RegisterResponseSchema
POST   /api/v1/auth/regenerate     → { apiKey: string }
DELETE /api/v1/auth/account        → 204 No Content
```

## Component Search

```
GET /api/v1/components/search?q=...  → SearchResponseSchema
```
Request validated against `SearchRequestSchema`.

## Component Upload

```
POST /api/v1/components/upload       → UploadResponseSchema (202)
GET  /api/v1/components/upload/:id/stream  → SSE stream of ReviewEventSchema
```

## Checkpoint Backup

```
POST /api/v1/checkpoints             Body: CheckpointUploadSchema
GET  /api/v1/checkpoints/:id         → CheckpointListResponseSchema
```

## Error Envelope

All 4xx/5xx responses use `ApiErrorSchema`. Known `error.code` values are
enumerated in `ErrorCodeSchema`.

## Rate Limits

| Endpoint | Limit |
|---|---|
| Search | 100 req/min |
| Upload | 10 req/hour |
| Checkpoint upload | 60 req/hour |
