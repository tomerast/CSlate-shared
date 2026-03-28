# Decision 002: Schema Boundaries

**Date:** 2026-03-28
**Status:** Accepted

## What belongs in @cslate/shared

These types are part of the client↔server contract and must be identical in both repos:

| Schema | Why it's shared |
|---|---|
| `ComponentManifestSchema` | Validated in Stage 1 of server review pipeline AND before client upload |
| `ComponentPackageSchema` | Upload payload shape — must match on both sides |
| `CheckpointUploadSchema` | Checkpoint backup payload sent from client to server |
| `CheckpointMetaSchema` | Returned by server when listing checkpoints |
| `SearchRequestSchema` | Client sends this; server validates it |
| `SearchResponseSchema` | Server returns this; client deserializes it |
| `ReviewEventSchema` | SSE event shape from server → client |
| `ApiErrorSchema` | All API errors use this envelope |
| `ErrorCodeSchema` | Enum of known error codes (e.g. `TOO_MANY_DATA_SOURCES`) |

## What stays in each repo

| Type | Lives in | Reason |
|---|---|---|
| `AgentRequest` / `AgentResponse` | `CSlate` only | Internal Electron IPC between main/renderer — not a server contract |
| `AgentMessage` | `CSlate` only | Same as above |
| DB table types (Drizzle) | `CSlate-Server` only | ORM-level types, never sent to client |
| Hono RPC route types | `CSlate-Server` only | Framework-specific, not part of public contract |
| Electron `BrowserWindow` configs | `CSlate` only | Platform-specific |

## Future additions (deferred, not in v0.1)

- `SlateThemeSchema` — design token system
- `GridConfigSchema` / `ComponentPlacementSchema` — canvas layout
- `LLMConfigSchema` — provider configuration
- `AppManifestSchema` — top-level `cslate.json` structure
- `TabConfigSchema` — tab layout + component placement
