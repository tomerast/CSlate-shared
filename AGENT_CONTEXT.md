# CSlate-Shared — Agent Context

**For:** A coding agent bootstrapping the `@cslate/shared` npm package
**Date written:** 2026-03-28
**Status:** Ready to implement

---

## What This Repo Is

`CSlate-shared` is a standalone npm package (`@cslate/shared`) that is the **single source of truth** for all data contracts shared between two separate repos:

| Repo | Role |
|---|---|
| `CSlate` | Electron desktop client (React + TypeScript) |
| `CSlate-server` | Backend API (Hono + Drizzle + PostgreSQL + pgvector on Fly.io) |
| **`CSlate-shared`** | **This repo — Zod schemas + TypeScript types** |

Both repos import from `@cslate/shared`. Neither repo duplicates these type definitions. Both pin to specific semver versions.

**Why Zod:** Runtime validation + TypeScript types + potential OpenAPI generation all from one source. The server validates manifests in Stage 1 of its review pipeline. The client validates before upload. Both use the same Zod schemas so schema drift is impossible.

---

## What CSlate Is (Product Context)

CSlate is a desktop chat portal for LLMs. Users chat with an assistant, and when an answer is clearer as a visual, the assistant renders a live React card inline in the conversation. Accepted components can be shared to a community library after server review.

The **core loop:**
```
Chat → Search community library → Render inline card or generate component → Iterate in message context → Share
```

**Components** are structured multi-file packages:
```
stock-ticker/
├── ui.tsx           # Required: React component (renders in sandboxed iframe)
├── logic.ts         # Optional: hooks, data transforms, business logic
├── types.ts         # Optional: TypeScript interfaces
├── context.md       # Required: AI-generated summary of build conversation + decisions
└── manifest.json    # Required: THE CONTRACT (inputs, outputs, events, actions, data sources)
```

The `manifest.json` is the most important artifact. It enables:
- **AI wiring** — connecting components via shared Zustand state keys
- **Community search** — semantic search via pgvector embeddings
- **Permission system** — user-gated external API access (data bridge)
- **Server review** — validation, security scan, cataloging, embedding

---

## Package Structure to Build

```
@cslate/shared
├── src/
│   ├── schemas/
│   │   ├── manifest.ts      # Zod schema for ComponentManifest (most important)
│   │   ├── checkpoint.ts    # Zod schema for checkpoint backup payloads
│   │   └── api.ts           # Zod schemas for API request/response bodies
│   ├── types/
│   │   └── index.ts         # Re-exports all z.infer<> types (no manual interfaces)
│   └── index.ts             # Single public entry: exports all schemas + types
├── package.json             # name: "@cslate/shared", publishConfig public
├── tsconfig.json
├── tsup.config.ts           # Build: ESM + CJS dual output
└── README.md
```

**Tech choices (non-negotiable):**
- TypeScript strict mode
- Zod v3 for all schemas (no Zod v4 — server team uses v3)
- tsup for bundling (dual ESM + CJS output)
- All TypeScript types are `z.infer<typeof SomeSchema>` — no hand-written interfaces that can drift
- Export both the Zod schemas (for runtime validation) and the inferred types (for TypeScript use)

---

## Schema 1: ComponentManifest (Most Critical)

This is the contract for every CSlate component. Both client and server validate against it.

```typescript
// src/schemas/manifest.ts

import { z } from 'zod'

// Field type options for inputs/outputs
const FieldTypeSchema = z.enum(['string', 'number', 'boolean', 'array', 'object', 'any'])

// Input port: what data the component accepts
const InputFieldSchema = z.object({
  type: FieldTypeSchema,
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
  stateKey: z.string().optional(), // Zustand store key to bind to
})

// Output port: what data the component writes
const OutputFieldSchema = z.object({
  type: FieldTypeSchema,
  description: z.string(),
  stateKey: z.string().optional(), // Zustand store key this writes to
})

// Event: fire-and-forget notification emitted by the component
const EventSchema = z.object({
  description: z.string(),
  payload: z.record(z.object({
    type: z.string(),
    description: z.string(),
  })),
})

// Action: imperative command the component responds to
const ActionSchema = z.object({
  description: z.string(),
  params: z.record(z.object({
    type: z.string(),
    description: z.string(),
  })),
})

// File entry in the package
const FileEntrySchema = z.object({
  path: z.string(),
  type: z.enum(['ui', 'logic', 'types', 'context', 'style', 'test', 'other']),
  role: z.string(), // Human-readable: "Main visual component", "Business logic hooks"
})

// Data source endpoint
const EndpointSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'POST']),
  description: z.string(),
  params: z.record(z.object({
    type: z.string(),
    description: z.string(),
    userConfigurable: z.boolean(),
    default: z.unknown().optional(),
  })),
  refreshInterval: z.number().optional(), // ms
})

// External data source (proxied through the data bridge)
const DataSourceSchema = z.object({
  description: z.string(),
  type: z.enum(['rest-api', 'websocket', 'graphql']),
  baseUrl: z.string().url(),
  endpoints: z.record(EndpointSchema),
  rateLimit: z.object({
    maxRequests: z.number(),
    perSeconds: z.number(),
  }).optional(),
})

// User-configurable parameter (API keys, symbols, settings)
const UserConfigFieldSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'string[]', 'object']),
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
  sensitive: z.boolean().optional(), // true = API keys, tokens; never shared to community
  example: z.unknown().optional(),
})

// Size in grid units (1 unit = 8px)
const SizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const ComponentManifestSchema = z.object({
  // === IDENTITY ===
  id: z.string().uuid().optional(),       // Assigned by server on upload
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tags: z.array(z.string()).max(10),
  version: z.string().optional(),         // Semver, server manages

  // === DATA INTERFACE ===
  inputs: z.record(InputFieldSchema),
  outputs: z.record(OutputFieldSchema),
  events: z.record(EventSchema),
  actions: z.record(ActionSchema),

  // === PACKAGE STRUCTURE ===
  files: z.array(FileEntrySchema),

  // === COMPOUND ANATOMY (optional) ===
  anatomy: z.object({
    parts: z.array(z.string()),
    slots: z.array(z.string()).optional(),
  }).optional(),

  // === DEPENDENCIES (optional) ===
  dependencies: z.object({
    cslateComponents: z.array(z.string()).optional(),
    npmPackages: z.array(z.object({
      name: z.string(),
      version: z.string(),
    })).optional(),
  }).optional(),

  // === EXTERNAL DATA SOURCES (max 5 — server rejects more) ===
  dataSources: z.record(DataSourceSchema).optional().superRefine((val, ctx) => {
    if (val && Object.keys(val).length > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 5,
        type: 'array',
        inclusive: true,
        message: 'TOO_MANY_DATA_SOURCES: maximum 5 dataSources per manifest',
      })
    }
  }),

  // === USER-CONFIGURABLE PARAMETERS (optional) ===
  userConfig: z.record(UserConfigFieldSchema).optional(),

  // === AI HINTS (server-generated during review, available after approval) ===
  ai: z.object({
    modificationHints: z.array(z.string()).optional(),
    extensionPoints: z.array(z.string()).optional(),
    similarTo: z.array(z.string().uuid()).optional(), // IDs of similar components
  }).optional(),

  // === LAYOUT ===
  defaultSize: SizeSchema,
  minSize: SizeSchema.optional(),
})
```

**Key business rules encoded in the schema:**
- `dataSources` max 5 — server rejects with `TOO_MANY_DATA_SOURCES` code
- `sensitive: true` on `userConfig` fields → these are never sent to community (client strips them before upload)
- `ai` hints are server-generated during Stage 5 of review (Manifest Enrichment) — always present on approved components
- `id` and `version` are assigned by server, optional on client-side (before upload)

---

## Schema 2: ComponentPackage

The full payload sent between client and server for uploads and source retrieval.

```typescript
// also in src/schemas/manifest.ts or a separate src/schemas/package.ts

export const ComponentPackageSchema = z.object({
  manifest: ComponentManifestSchema,
  files: z.record(z.string()),  // path → file content (e.g., "ui.tsx" → "import React...")
})
```

**Upload size limits (client validates before sending):**
| Limit | Value |
|---|---|
| Per file | 500 KB |
| Total package | 2 MB |
| Manifest alone | 50 KB |

---

## Schema 3: Checkpoint

Private per-user backup of a component at a point in time.

```typescript
// src/schemas/checkpoint.ts

export const CheckpointTriggerSchema = z.enum([
  'user-accept',      // User clicked Accept
  'pre-modification', // Auto-saved before a major AI change
  'manual',           // User explicitly saved
  'auto-interval',    // Periodic auto-save
])

export const CheckpointUploadSchema = z.object({
  projectId: z.string().uuid(),
  componentLocalId: z.string(),      // Local identifier (not server UUID)
  componentName: z.string(),
  version: z.string(),               // Local version number e.g. "v3"
  files: z.record(z.string()),       // path → content
  manifest: ComponentManifestSchema,
  description: z.string().max(500),  // AI-generated description of this version
  trigger: CheckpointTriggerSchema,
})

export const CheckpointMetaSchema = z.object({
  version: z.string(),
  componentName: z.string(),
  description: z.string(),
  trigger: CheckpointTriggerSchema,
  createdAt: z.string().datetime(),
})

export const CheckpointListResponseSchema = z.object({
  componentLocalId: z.string(),
  projectId: z.string().uuid(),
  checkpoints: z.array(CheckpointMetaSchema),
})
```

---

## Schema 4: API Request/Response Bodies

```typescript
// src/schemas/api.ts

// Auth
export const RegisterResponseSchema = z.object({
  apiKey: z.string(),
  userId: z.string().uuid(),
})

// Search
export const SearchRequestSchema = z.object({
  q: z.string().min(1),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
  minRating: z.number().min(1).max(5).optional(),
  sortBy: z.enum(['relevance', 'rating', 'downloads', 'recent']).default('relevance'),
})

export const SearchResultItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  summary: z.string(),         // AI-generated 1-2 sentence "why this was built"
  description: z.string(),
  tags: z.array(z.string()),
  category: z.string(),
  complexity: z.string(),
  rating: z.number(),
  downloadCount: z.number(),
  relevanceScore: z.number(),
  manifest: ComponentManifestSchema,
})

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultItemSchema),
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
})

// Upload
export const UploadResponseSchema = z.object({
  uploadId: z.string().uuid(),
  status: z.literal('pending_review'),
})

// Review stages (used by client to display progress in SSE stream)
export const ReviewStageSchema = z.enum([
  'manifest_validation',   // Stage 1: Validate manifest schema + completeness
  'security_scan',         // Stage 2: Check for malicious patterns (fetch, XHR, WebSocket abuse)
  'dependency_check',      // Stage 3: Validate dependencies are safe/available
  'quality_review',        // Stage 4: Code quality + Tailwind token enforcement
  'test_render',           // Stage 5: TypeScript compilation + JSX validity (no headless browser)
  'cataloging',            // Stage 6: AI summarization + categorization
  'embedding',             // Stage 7: Vector embedding generation
])

export const ReviewEventSchema = z.object({
  stage: ReviewStageSchema.or(z.literal('complete')),
  status: z.enum(['in_progress', 'complete', 'failed']),
  progress: z.number().min(0).max(1).optional(),
  result: z.enum(['passed', 'failed', 'approved', 'rejected']).optional(),
  componentId: z.string().uuid().optional(),  // Present on stage=complete, status=approved
  reason: z.string().optional(),              // Present on rejection
})

// Check updates (client polls on launch + every 30min)
export const CheckUpdatesRequestSchema = z.object({
  componentIds: z.array(z.string().uuid()),
})

export const CheckUpdatesResponseSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    currentVersion: z.string(),
    latestVersion: z.string(),
    changelog: z.string().optional(),
  })),
  revocations: z.array(z.object({
    id: z.string().uuid(),
    reason: z.enum(['security', 'abuse', 'legal', 'author-request']),
    message: z.string().optional(), // Human-readable, shown to user
  })),
})

// Rating
export const RateComponentRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

// Report abuse
export const ReportAbuseRequestSchema = z.object({
  reason: z.enum(['malicious-code', 'spam', 'copyright', 'inappropriate', 'other']),
  description: z.string().max(1000).optional(),
})

// Error envelope (all API errors use this shape)
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  statusCode: z.number(),
})

// Known error codes
export const ErrorCodeSchema = z.enum([
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'MANIFEST_INVALID',
  'UPLOAD_TOO_LARGE',
  'REVIEW_REJECTED',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'TOO_MANY_DATA_SOURCES',
  'STYLING_TOKEN_VIOLATION',  // Raw color utility used instead of semantic token
])
```

**Important `STYLING_TOKEN_VIOLATION`:** Stage 4 (quality review) hard-rejects components that use raw Tailwind color utilities (`bg-blue-500`, `text-gray-900`) instead of semantic design tokens (`bg-primary`, `text-muted`). The rejection code `STYLING_TOKEN_VIOLATION` is returned. The client receives this and can trigger AI regeneration.

---

## src/types/index.ts

All types are inferred from Zod schemas — no hand-written interfaces.

```typescript
// src/types/index.ts
export type { z } from 'zod'

import {
  ComponentManifestSchema,
  ComponentPackageSchema,
  FieldTypeSchema,
  InputFieldSchema,
  OutputFieldSchema,
  EventSchema,
  ActionSchema,
  FileEntrySchema,
  DataSourceSchema,
  UserConfigFieldSchema,
  SizeSchema,
} from '../schemas/manifest'

import {
  CheckpointUploadSchema,
  CheckpointMetaSchema,
  CheckpointListResponseSchema,
  CheckpointTriggerSchema,
} from '../schemas/checkpoint'

import {
  SearchRequestSchema,
  SearchResponseSchema,
  SearchResultItemSchema,
  UploadResponseSchema,
  ReviewStageSchema,
  ReviewEventSchema,
  CheckUpdatesRequestSchema,
  CheckUpdatesResponseSchema,
  RateComponentRequestSchema,
  ReportAbuseRequestSchema,
  ApiErrorSchema,
  ErrorCodeSchema,
} from '../schemas/api'

export type ComponentManifest = z.infer<typeof ComponentManifestSchema>
export type ComponentPackage = z.infer<typeof ComponentPackageSchema>
export type FieldType = z.infer<typeof FieldTypeSchema>
export type InputField = z.infer<typeof InputFieldSchema>
export type OutputField = z.infer<typeof OutputFieldSchema>
export type ComponentEvent = z.infer<typeof EventSchema>
export type ComponentAction = z.infer<typeof ActionSchema>
export type FileEntry = z.infer<typeof FileEntrySchema>
export type DataSource = z.infer<typeof DataSourceSchema>
export type UserConfigField = z.infer<typeof UserConfigFieldSchema>
export type ComponentSize = z.infer<typeof SizeSchema>

export type CheckpointUpload = z.infer<typeof CheckpointUploadSchema>
export type CheckpointMeta = z.infer<typeof CheckpointMetaSchema>
export type CheckpointListResponse = z.infer<typeof CheckpointListResponseSchema>
export type CheckpointTrigger = z.infer<typeof CheckpointTriggerSchema>

export type SearchRequest = z.infer<typeof SearchRequestSchema>
export type SearchResponse = z.infer<typeof SearchResponseSchema>
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>
export type UploadResponse = z.infer<typeof UploadResponseSchema>
export type ReviewStage = z.infer<typeof ReviewStageSchema>
export type ReviewEvent = z.infer<typeof ReviewEventSchema>
export type CheckUpdatesRequest = z.infer<typeof CheckUpdatesRequestSchema>
export type CheckUpdatesResponse = z.infer<typeof CheckUpdatesResponseSchema>
export type RateComponentRequest = z.infer<typeof RateComponentRequestSchema>
export type ReportAbuseRequest = z.infer<typeof ReportAbuseRequestSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>
export type ErrorCode = z.infer<typeof ErrorCodeSchema>
```

---

## src/index.ts (Public API)

```typescript
// Re-export everything — consumers import from '@cslate/shared'
export * from './schemas/manifest'
export * from './schemas/checkpoint'
export * from './schemas/api'
export * from './types'
```

---

## package.json

```json
{
  "name": "@cslate/shared",
  "version": "0.1.0",
  "description": "Shared Zod schemas and TypeScript types for CSlate client and server",
  "license": "Apache-2.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "prepublishOnly": "npm run build && npm run typecheck && npm run test"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsup": "^8.0.0",
    "vitest": "^1.4.0"
  },
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/tomerast/CSlate-shared.git"
  }
}
```

---

## tsup.config.ts

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
})
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Tests to Write

Write a test file `src/schemas/manifest.test.ts` (and similar for checkpoint/api) that covers:

**Happy path:**
- Valid minimal manifest (only required fields)
- Valid full manifest (all optional fields populated)
- Manifest with dataSources (≤5 sources)

**Rejection cases:**
- Missing required fields (`name`, `description`, `tags`, `files`, `defaultSize`, `inputs`, `outputs`, `events`, `actions`)
- `dataSources` with 6 entries → must fail with `TOO_MANY_DATA_SOURCES`
- Invalid UUID for `id`
- Invalid semver-format `version` (if validated)
- `defaultSize` with 0 or negative width/height

**Round-trip:**
- Parse valid JSON → validate → re-serialize → re-parse → deep equal

---

## How This Repo Is Published

1. Build: `npm run build` (tsup outputs `dist/`)
2. Check: `npm run typecheck && npm run test`
3. Publish: `npm publish` (public, scoped package `@cslate/shared`)
4. Consumers pin: `"@cslate/shared": "^0.1.0"` in their `package.json`

For local development before publishing, both `CSlate` and `CSlate-server` can use:
```json
"@cslate/shared": "file:../CSlate-shared"
```
or `npm link`.

---

## How CSlate (Client) Currently Uses Shared Types

The client repo (`CSlate`) currently has `src/shared/agentTypes.ts` which contains **client-internal** agent types (`AgentRequest`, `AgentResponse`, `AgentMessage`). These are NOT moving to `@cslate/shared` — they are IPC types specific to the Electron client's internal agent runner, not part of the client-server contract.

What DOES move to `@cslate/shared`:
- `ComponentManifest` and everything in this document
- All API request/response types
- Checkpoint types

What stays in the client repo:
- `AgentRequest` / `AgentResponse` / `AgentMessage` — internal to `CSlate` only

---

## What the Server Team Needs to Know

The server (`CSlate-server`) will import like this:
```typescript
import { ComponentManifestSchema, ComponentPackageSchema, ReviewStageSchema } from '@cslate/shared'

// Stage 1 of review pipeline:
const result = ComponentManifestSchema.safeParse(incoming.manifest)
if (!result.success) {
  return { code: 'MANIFEST_INVALID', errors: result.error.flatten() }
}
```

The server also uses `ReviewStageSchema` as the authoritative list of stages — no duplicating the enum.

---

## Future Additions (NOT for v0.1)

These are in scope eventually but not for the initial package:

- `SlateTheme` schema — design token system
- `InlineCard` schema — richer message-card metadata
- `LLMConfig` schema — provider configuration
- `AppManifest` schema — top-level app structure (`cslate.json`)
- `TabConfig` schema — tab layout + component placement

Keep v0.1 focused: manifest, checkpoint, and API schemas only.

---

## Implementation Checklist

1. `npm init` / `package.json` as above
2. Install deps: `npm install zod` and dev deps
3. `tsconfig.json` as above
4. `tsup.config.ts` as above
5. Write `src/schemas/manifest.ts` — ComponentManifest is the most important
6. Write `src/schemas/checkpoint.ts`
7. Write `src/schemas/api.ts`
8. Write `src/types/index.ts` — all z.infer<> exports
9. Write `src/index.ts` — re-export everything
10. Write tests in `src/schemas/*.test.ts`
11. `npm run build` — verify dist/ outputs ESM + CJS + .d.ts
12. `npm run typecheck` — must pass with zero errors
13. `npm run test` — all tests green
14. Initial commit + push to `https://github.com/tomerast/CSlate-shared`
15. `npm publish` (or defer until CSlate-server is ready to consume it)
