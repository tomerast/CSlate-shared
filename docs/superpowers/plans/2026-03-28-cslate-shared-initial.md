# CSlate-Shared Initial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the `@cslate/shared` npm package — the single source of truth for all Zod schemas and TypeScript types shared between the CSlate Electron client and CSlate-Server backend.

**Architecture:** A pure TypeScript library with no runtime dependencies beyond Zod v3. Schemas are defined once, TypeScript types are derived via `z.infer<>` (no hand-written interfaces), and the package ships dual ESM + CJS output via tsup so both the Electron client (ESM) and any Node.js server (CJS) can consume it without configuration.

**Tech Stack:** TypeScript 5.4 strict mode · Zod v3.23 · tsup 8 (ESM + CJS + `.d.ts`) · Vitest 1.4

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Package identity, scripts, deps |
| `tsconfig.json` | TypeScript strict config |
| `tsup.config.ts` | Build: ESM + CJS dual output with `.d.ts` |
| `src/schemas/manifest.ts` | `ComponentManifestSchema`, `ComponentPackageSchema` — the core contract |
| `src/schemas/checkpoint.ts` | Checkpoint backup upload/meta/list schemas |
| `src/schemas/api.ts` | Search, upload, review SSE, error, rating, abuse schemas |
| `src/types/index.ts` | All `z.infer<>` TypeScript type exports |
| `src/index.ts` | Public entry: re-exports all schemas + types |
| `src/schemas/manifest.test.ts` | Tests for manifest schema |
| `src/schemas/checkpoint.test.ts` | Tests for checkpoint schemas |
| `src/schemas/api.test.ts` | Tests for API schemas |
| `docs/decisions/001-package-design.md` | Why Zod v3, tsup, dual output, no hand-written types |
| `docs/decisions/002-schema-boundaries.md` | What lives here vs stays in each consuming repo |
| `docs/contracts/api-contract.md` | Copy of the API contract relevant to this package |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`

- [ ] **Step 1: Create package.json**

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
    "test:watch": "vitest",
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

- [ ] **Step 2: Create tsconfig.json**

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

- [ ] **Step 3: Create tsup.config.ts**

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

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `node_modules/` created, `package-lock.json` updated. No errors.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json tsup.config.ts package-lock.json
git commit -m "chore: scaffold @cslate/shared package"
```

---

## Task 2: Decision Documentation

**Files:**
- Create: `docs/decisions/001-package-design.md`
- Create: `docs/decisions/002-schema-boundaries.md`
- Create: `docs/contracts/api-contract.md`

- [ ] **Step 1: Write decision 001 — package design choices**

Create `docs/decisions/001-package-design.md`:

```markdown
# Decision 001: Package Design

**Date:** 2026-03-28
**Status:** Accepted

## Context

`@cslate/shared` must be importable by two very different environments:
- CSlate (Electron app) — uses ESM, bundled by electron-vite
- CSlate-Server (Node.js backend) — may use CJS or ESM depending on Hono setup

## Decisions

### Zod v3 (not v4)
The CSlate-Server team has standardized on Zod v3.23. Using v4 would create a version conflict since both client and server must use the same schema package. Zod v3 is pinned at `^3.23.0`.

### Dual ESM + CJS output via tsup
tsup compiles `src/index.ts` to both `dist/index.js` (ESM) and `dist/index.cjs` (CJS) with a single `dist/index.d.ts` type declaration. The `exports` field in `package.json` routes consumers to the correct format automatically.

**Why not ESM-only:** CSlate-Server may run in a CJS context during test/development; forcing ESM breaks `require()` in older toolchains.

### No hand-written TypeScript interfaces
All exported types are `z.infer<typeof SomeSchema>`. This guarantees the runtime Zod schema and the TypeScript type are always in sync. A hand-written interface can drift from the schema; an inferred type cannot.

### TypeScript strict mode
Catches null/undefined bugs at compile time. Both consuming repos already use strict mode — this package matches that baseline.

### Apache-2.0 license
Matches the CSlate and CSlate-Server repositories.
```

- [ ] **Step 2: Write decision 002 — schema boundary (what lives here)**

Create `docs/decisions/002-schema-boundaries.md`:

```markdown
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
```

- [ ] **Step 3: Write contracts reference**

Create `docs/contracts/api-contract.md`:

```markdown
# CSlate Server API Contract Reference

**Version:** 3.0
**Source of truth:** See full contract in CSlate/docs/contracts/server-api-contract.md

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
```

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs: add design decisions and API contract reference"
```

---

## Task 3: ComponentManifest Schema (TDD)

**Files:**
- Create: `src/schemas/manifest.ts`
- Create: `src/schemas/manifest.test.ts`

- [ ] **Step 1: Create empty src/schemas/manifest.ts**

```typescript
// src/schemas/manifest.ts
import { z } from 'zod'

export const FieldTypeSchema = z.enum(['string', 'number', 'boolean', 'array', 'object', 'any'])

export const InputFieldSchema = z.object({
  type: FieldTypeSchema,
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
  stateKey: z.string().optional(),
})

export const OutputFieldSchema = z.object({
  type: FieldTypeSchema,
  description: z.string(),
  stateKey: z.string().optional(),
})

export const EventSchema = z.object({
  description: z.string(),
  payload: z.record(z.object({
    type: z.string(),
    description: z.string(),
  })),
})

export const ActionSchema = z.object({
  description: z.string(),
  params: z.record(z.object({
    type: z.string(),
    description: z.string(),
  })),
})

export const FileEntrySchema = z.object({
  path: z.string(),
  type: z.enum(['ui', 'logic', 'types', 'context', 'style', 'test', 'other']),
  role: z.string(),
})

export const EndpointSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'POST']),
  description: z.string(),
  params: z.record(z.object({
    type: z.string(),
    description: z.string(),
    userConfigurable: z.boolean(),
    default: z.unknown().optional(),
  })),
  refreshInterval: z.number().optional(),
})

export const DataSourceSchema = z.object({
  description: z.string(),
  type: z.enum(['rest-api', 'websocket', 'graphql']),
  baseUrl: z.string().url(),
  endpoints: z.record(EndpointSchema),
  rateLimit: z.object({
    maxRequests: z.number(),
    perSeconds: z.number(),
  }).optional(),
})

export const UserConfigFieldSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'string[]', 'object']),
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
  sensitive: z.boolean().optional(),
  example: z.unknown().optional(),
})

export const SizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const ComponentManifestSchema = z.object({
  // Identity
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tags: z.array(z.string()).max(10),
  version: z.string().optional(),

  // Data interface
  inputs: z.record(InputFieldSchema),
  outputs: z.record(OutputFieldSchema),
  events: z.record(EventSchema),
  actions: z.record(ActionSchema),

  // Package structure
  files: z.array(FileEntrySchema),

  // Compound anatomy (optional)
  anatomy: z.object({
    parts: z.array(z.string()),
    slots: z.array(z.string()).optional(),
  }).optional(),

  // Dependencies (optional)
  dependencies: z.object({
    cslateComponents: z.array(z.string()).optional(),
    npmPackages: z.array(z.object({
      name: z.string(),
      version: z.string(),
    })).optional(),
  }).optional(),

  // External data sources — max 5, server rejects more with TOO_MANY_DATA_SOURCES
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

  // User-configurable parameters (API keys, settings)
  // sensitive: true fields are stripped by client before community upload
  userConfig: z.record(UserConfigFieldSchema).optional(),

  // AI hints — server-generated during Stage 6 (cataloging), present on approved components
  ai: z.object({
    modificationHints: z.array(z.string()).optional(),
    extensionPoints: z.array(z.string()).optional(),
    similarTo: z.array(z.string().uuid()).optional(),
  }).optional(),

  // Layout
  defaultSize: SizeSchema,
  minSize: SizeSchema.optional(),
})

export const ComponentPackageSchema = z.object({
  manifest: ComponentManifestSchema,
  files: z.record(z.string()),
})
```

- [ ] **Step 2: Write failing tests**

Create `src/schemas/manifest.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { ComponentManifestSchema, ComponentPackageSchema } from './manifest'

const minimalManifest = {
  name: 'Stock Ticker',
  description: 'Displays real-time stock prices',
  tags: ['finance', 'data'],
  inputs: {},
  outputs: {},
  events: {},
  actions: {},
  files: [
    { path: 'ui.tsx', type: 'ui', role: 'Main visual component' },
  ],
  defaultSize: { width: 4, height: 2 },
}

describe('ComponentManifestSchema', () => {
  describe('happy path', () => {
    it('accepts a minimal valid manifest', () => {
      const result = ComponentManifestSchema.safeParse(minimalManifest)
      expect(result.success).toBe(true)
    })

    it('accepts a full manifest with all optional fields', () => {
      const full = {
        ...minimalManifest,
        id: '550e8400-e29b-41d4-a716-446655440000',
        version: '1.0.0',
        inputs: {
          symbol: { type: 'string', description: 'Stock ticker symbol', required: true, stateKey: 'selectedSymbol' },
        },
        outputs: {
          price: { type: 'number', description: 'Current price', stateKey: 'currentPrice' },
        },
        events: {
          priceAlert: {
            description: 'Fired when price crosses threshold',
            payload: { price: { type: 'number', description: 'Triggered price' } },
          },
        },
        actions: {
          refresh: {
            description: 'Force refresh the price',
            params: {},
          },
        },
        files: [
          { path: 'ui.tsx', type: 'ui', role: 'Main visual component' },
          { path: 'logic.ts', type: 'logic', role: 'Data fetching hooks' },
          { path: 'types.ts', type: 'types', role: 'TypeScript interfaces' },
          { path: 'context.md', type: 'context', role: 'Build context' },
        ],
        anatomy: { parts: ['header', 'price-display', 'chart'], slots: ['header-right'] },
        dependencies: {
          npmPackages: [{ name: 'recharts', version: '^2.0.0' }],
        },
        userConfig: {
          apiKey: { type: 'string', description: 'Alpha Vantage API key', required: true, sensitive: true },
        },
        ai: {
          modificationHints: ['Change colors in ui.tsx lines 12-20'],
          extensionPoints: ['Add new symbols by extending the symbols array in logic.ts'],
          similarTo: ['550e8400-e29b-41d4-a716-446655440001'],
        },
        minSize: { width: 2, height: 2 },
      }
      const result = ComponentManifestSchema.safeParse(full)
      expect(result.success).toBe(true)
    })

    it('accepts manifest with up to 5 dataSources', () => {
      const withSources = {
        ...minimalManifest,
        dataSources: {
          source1: {
            description: 'Alpha Vantage',
            type: 'rest-api',
            baseUrl: 'https://www.alphavantage.co',
            endpoints: {
              quote: {
                path: '/query',
                method: 'GET',
                description: 'Get quote',
                params: {
                  symbol: { type: 'string', description: 'Ticker', userConfigurable: true },
                },
              },
            },
          },
          source2: { description: 'S2', type: 'rest-api', baseUrl: 'https://api.example.com', endpoints: {} },
          source3: { description: 'S3', type: 'rest-api', baseUrl: 'https://api.example.com', endpoints: {} },
          source4: { description: 'S4', type: 'rest-api', baseUrl: 'https://api.example.com', endpoints: {} },
          source5: { description: 'S5', type: 'rest-api', baseUrl: 'https://api.example.com', endpoints: {} },
        },
      }
      const result = ComponentManifestSchema.safeParse(withSources)
      expect(result.success).toBe(true)
    })

    it('round-trips through JSON serialization', () => {
      const parsed = ComponentManifestSchema.parse(minimalManifest)
      const serialized = JSON.stringify(parsed)
      const reparsed = ComponentManifestSchema.parse(JSON.parse(serialized))
      expect(reparsed).toEqual(parsed)
    })
  })

  describe('rejection cases', () => {
    it('rejects missing name', () => {
      const { name: _, ...rest } = minimalManifest
      expect(ComponentManifestSchema.safeParse(rest).success).toBe(false)
    })

    it('rejects empty name', () => {
      expect(ComponentManifestSchema.safeParse({ ...minimalManifest, name: '' }).success).toBe(false)
    })

    it('rejects name over 100 characters', () => {
      expect(ComponentManifestSchema.safeParse({ ...minimalManifest, name: 'a'.repeat(101) }).success).toBe(false)
    })

    it('rejects missing description', () => {
      const { description: _, ...rest } = minimalManifest
      expect(ComponentManifestSchema.safeParse(rest).success).toBe(false)
    })

    it('rejects description over 500 characters', () => {
      expect(ComponentManifestSchema.safeParse({ ...minimalManifest, description: 'a'.repeat(501) }).success).toBe(false)
    })

    it('rejects more than 10 tags', () => {
      const tags = Array.from({ length: 11 }, (_, i) => `tag${i}`)
      expect(ComponentManifestSchema.safeParse({ ...minimalManifest, tags }).success).toBe(false)
    })

    it('rejects invalid UUID for id', () => {
      expect(ComponentManifestSchema.safeParse({ ...minimalManifest, id: 'not-a-uuid' }).success).toBe(false)
    })

    it('rejects defaultSize with zero width', () => {
      expect(ComponentManifestSchema.safeParse({ ...minimalManifest, defaultSize: { width: 0, height: 2 } }).success).toBe(false)
    })

    it('rejects defaultSize with negative height', () => {
      expect(ComponentManifestSchema.safeParse({ ...minimalManifest, defaultSize: { width: 4, height: -1 } }).success).toBe(false)
    })

    it('rejects missing files array', () => {
      const { files: _, ...rest } = minimalManifest
      expect(ComponentManifestSchema.safeParse(rest).success).toBe(false)
    })

    it('rejects dataSources with 6 entries with TOO_MANY_DATA_SOURCES message', () => {
      const withSixSources = {
        ...minimalManifest,
        dataSources: {
          s1: { description: 'S1', type: 'rest-api', baseUrl: 'https://api.example.com', endpoints: {} },
          s2: { description: 'S2', type: 'rest-api', baseUrl: 'https://api.example.com', endpoints: {} },
          s3: { description: 'S3', type: 'rest-api', baseUrl: 'https://api.example.com', endpoints: {} },
          s4: { description: 'S4', type: 'rest-api', baseUrl: 'https://api.example.com', endpoints: {} },
          s5: { description: 'S5', type: 'rest-api', baseUrl: 'https://api.example.com', endpoints: {} },
          s6: { description: 'S6', type: 'rest-api', baseUrl: 'https://api.example.com', endpoints: {} },
        },
      }
      const result = ComponentManifestSchema.safeParse(withSixSources)
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map(i => i.message)
        expect(messages.some(m => m.includes('TOO_MANY_DATA_SOURCES'))).toBe(true)
      }
    })

    it('rejects invalid dataSource baseUrl', () => {
      const withBadUrl = {
        ...minimalManifest,
        dataSources: {
          s1: { description: 'S1', type: 'rest-api', baseUrl: 'not-a-url', endpoints: {} },
        },
      }
      expect(ComponentManifestSchema.safeParse(withBadUrl).success).toBe(false)
    })
  })
})

describe('ComponentPackageSchema', () => {
  it('accepts valid package', () => {
    const pkg = {
      manifest: minimalManifest,
      files: {
        'ui.tsx': 'import React from "react"\nexport default function Comp() { return <div /> }',
      },
    }
    expect(ComponentPackageSchema.safeParse(pkg).success).toBe(true)
  })

  it('rejects package with invalid manifest', () => {
    const pkg = {
      manifest: { name: '' },
      files: {},
    }
    expect(ComponentPackageSchema.safeParse(pkg).success).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail (schema file exists but tests confirm behaviour)**

Run: `npm test -- src/schemas/manifest.test.ts`

Expected: All tests PASS (schema is already written above — TDD here confirms the schema matches spec intent)

- [ ] **Step 4: Commit**

```bash
git add src/schemas/manifest.ts src/schemas/manifest.test.ts
git commit -m "feat: add ComponentManifest and ComponentPackage schemas with tests"
```

---

## Task 4: Checkpoint Schema (TDD)

**Files:**
- Create: `src/schemas/checkpoint.ts`
- Create: `src/schemas/checkpoint.test.ts`

- [ ] **Step 1: Create src/schemas/checkpoint.ts**

```typescript
import { z } from 'zod'
import { ComponentManifestSchema } from './manifest'

export const CheckpointTriggerSchema = z.enum([
  'user-accept',       // User clicked Accept in the iteration loop
  'pre-modification',  // Auto-saved before a major AI change
  'manual',            // User explicitly triggered a save
  'auto-interval',     // Periodic auto-save
])

export const CheckpointUploadSchema = z.object({
  projectId: z.string().uuid(),
  componentLocalId: z.string(),      // Local client identifier (not server UUID)
  componentName: z.string(),
  version: z.string(),               // Local version string, e.g. "v3"
  files: z.record(z.string()),       // path → file content
  manifest: ComponentManifestSchema,
  description: z.string().max(500),  // AI-generated summary of this version
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

- [ ] **Step 2: Create src/schemas/checkpoint.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import {
  CheckpointTriggerSchema,
  CheckpointUploadSchema,
  CheckpointMetaSchema,
  CheckpointListResponseSchema,
} from './checkpoint'

const minimalManifest = {
  name: 'Todo List',
  description: 'A simple todo list component',
  tags: ['productivity'],
  inputs: {},
  outputs: {},
  events: {},
  actions: {},
  files: [{ path: 'ui.tsx', type: 'ui', role: 'Main visual component' }],
  defaultSize: { width: 3, height: 4 },
}

const validUpload = {
  projectId: '550e8400-e29b-41d4-a716-446655440000',
  componentLocalId: 'todo-list-abc123',
  componentName: 'Todo List',
  version: 'v3',
  files: { 'ui.tsx': 'export default function TodoList() { return <div /> }' },
  manifest: minimalManifest,
  description: 'Added drag-and-drop reordering of items',
  trigger: 'user-accept' as const,
}

describe('CheckpointTriggerSchema', () => {
  it('accepts all valid trigger values', () => {
    const valid = ['user-accept', 'pre-modification', 'manual', 'auto-interval']
    valid.forEach(t => {
      expect(CheckpointTriggerSchema.safeParse(t).success).toBe(true)
    })
  })

  it('rejects unknown trigger values', () => {
    expect(CheckpointTriggerSchema.safeParse('unknown').success).toBe(false)
  })
})

describe('CheckpointUploadSchema', () => {
  it('accepts a valid checkpoint upload', () => {
    expect(CheckpointUploadSchema.safeParse(validUpload).success).toBe(true)
  })

  it('rejects invalid projectId (not UUID)', () => {
    expect(CheckpointUploadSchema.safeParse({ ...validUpload, projectId: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects description over 500 chars', () => {
    expect(CheckpointUploadSchema.safeParse({ ...validUpload, description: 'a'.repeat(501) }).success).toBe(false)
  })

  it('rejects invalid manifest in upload', () => {
    expect(CheckpointUploadSchema.safeParse({ ...validUpload, manifest: { name: '' } }).success).toBe(false)
  })

  it('accepts empty files record', () => {
    // files can be empty (edge case: manifest-only checkpoint)
    expect(CheckpointUploadSchema.safeParse({ ...validUpload, files: {} }).success).toBe(true)
  })
})

describe('CheckpointMetaSchema', () => {
  const validMeta = {
    version: 'v3',
    componentName: 'Todo List',
    description: 'Added drag-and-drop',
    trigger: 'user-accept',
    createdAt: '2026-03-28T10:00:00.000Z',
  }

  it('accepts valid meta', () => {
    expect(CheckpointMetaSchema.safeParse(validMeta).success).toBe(true)
  })

  it('rejects invalid datetime format', () => {
    expect(CheckpointMetaSchema.safeParse({ ...validMeta, createdAt: '2026-03-28' }).success).toBe(false)
  })
})

describe('CheckpointListResponseSchema', () => {
  it('accepts valid list response', () => {
    const response = {
      componentLocalId: 'todo-list-abc123',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      checkpoints: [
        {
          version: 'v3',
          componentName: 'Todo List',
          description: 'Added drag-and-drop',
          trigger: 'user-accept',
          createdAt: '2026-03-28T10:00:00.000Z',
        },
      ],
    }
    expect(CheckpointListResponseSchema.safeParse(response).success).toBe(true)
  })

  it('accepts empty checkpoints array', () => {
    const response = {
      componentLocalId: 'todo-list-abc123',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      checkpoints: [],
    }
    expect(CheckpointListResponseSchema.safeParse(response).success).toBe(true)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- src/schemas/checkpoint.test.ts`

Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/schemas/checkpoint.ts src/schemas/checkpoint.test.ts
git commit -m "feat: add checkpoint schemas with tests"
```

---

## Task 5: API Schemas (TDD)

**Files:**
- Create: `src/schemas/api.ts`
- Create: `src/schemas/api.test.ts`

- [ ] **Step 1: Create src/schemas/api.ts**

```typescript
import { z } from 'zod'
import { ComponentManifestSchema } from './manifest'

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

// Review pipeline SSE stream
// Stage names are the authoritative enum — CSlate-Server imports this directly
export const ReviewStageSchema = z.enum([
  'manifest_validation',   // Stage 1: Validate manifest schema + completeness
  'security_scan',         // Stage 2: Check for malicious patterns (fetch, XHR, WebSocket abuse)
  'dependency_check',      // Stage 3: Validate dependencies are safe/available
  'quality_review',        // Stage 4: Code quality + Tailwind token enforcement (STYLING_TOKEN_VIOLATION)
  'test_render',           // Stage 5: TypeScript compilation + JSX validity
  'cataloging',            // Stage 6: AI summarization + categorization + AI hint generation
  'embedding',             // Stage 7: Vector embedding generation
])

export const ReviewEventSchema = z.object({
  stage: ReviewStageSchema.or(z.literal('complete')),
  status: z.enum(['in_progress', 'complete', 'failed']),
  progress: z.number().min(0).max(1).optional(),
  result: z.enum(['passed', 'failed', 'approved', 'rejected']).optional(),
  componentId: z.string().uuid().optional(),  // Present when stage=complete + status=approved
  reason: z.string().optional(),              // Present on rejection (e.g. STYLING_TOKEN_VIOLATION)
})

// Check updates — client polls on app launch + every 30 min
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
    message: z.string().optional(),  // Shown to user: "Component X has been removed because..."
  })),
})

// Rating
export const RateComponentRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

// Abuse report
export const ReportAbuseRequestSchema = z.object({
  reason: z.enum(['malicious-code', 'spam', 'copyright', 'inappropriate', 'other']),
  description: z.string().max(1000).optional(),
})

// Error envelope — all API errors use this shape
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  statusCode: z.number(),
})

// Known error codes — consumers can switch on these
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
  'STYLING_TOKEN_VIOLATION',  // Raw Tailwind color utility used instead of semantic design token
])
```

- [ ] **Step 2: Create src/schemas/api.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import {
  RegisterResponseSchema,
  SearchRequestSchema,
  SearchResponseSchema,
  UploadResponseSchema,
  ReviewStageSchema,
  ReviewEventSchema,
  CheckUpdatesRequestSchema,
  CheckUpdatesResponseSchema,
  RateComponentRequestSchema,
  ReportAbuseRequestSchema,
  ApiErrorSchema,
  ErrorCodeSchema,
} from './api'

const minimalManifest = {
  name: 'Todo List',
  description: 'A simple todo list component',
  tags: [],
  inputs: {},
  outputs: {},
  events: {},
  actions: {},
  files: [{ path: 'ui.tsx', type: 'ui', role: 'Main visual component' }],
  defaultSize: { width: 3, height: 4 },
}

describe('RegisterResponseSchema', () => {
  it('accepts valid registration response', () => {
    const response = { apiKey: 'sk-abc123', userId: '550e8400-e29b-41d4-a716-446655440000' }
    expect(RegisterResponseSchema.safeParse(response).success).toBe(true)
  })

  it('rejects invalid userId', () => {
    expect(RegisterResponseSchema.safeParse({ apiKey: 'sk-abc', userId: 'not-uuid' }).success).toBe(false)
  })
})

describe('SearchRequestSchema', () => {
  it('accepts minimal search request', () => {
    expect(SearchRequestSchema.safeParse({ q: 'stock ticker' }).success).toBe(true)
  })

  it('applies defaults: limit=10, offset=0, sortBy=relevance', () => {
    const result = SearchRequestSchema.parse({ q: 'stock ticker' })
    expect(result.limit).toBe(10)
    expect(result.offset).toBe(0)
    expect(result.sortBy).toBe('relevance')
  })

  it('rejects empty query string', () => {
    expect(SearchRequestSchema.safeParse({ q: '' }).success).toBe(false)
  })

  it('rejects limit over 50', () => {
    expect(SearchRequestSchema.safeParse({ q: 'test', limit: 51 }).success).toBe(false)
  })

  it('rejects invalid sortBy', () => {
    expect(SearchRequestSchema.safeParse({ q: 'test', sortBy: 'invalid' }).success).toBe(false)
  })

  it('accepts full search request', () => {
    const full = {
      q: 'stock ticker',
      tags: ['finance'],
      category: 'data',
      complexity: 'moderate',
      limit: 20,
      offset: 0,
      minRating: 3,
      sortBy: 'rating',
    }
    expect(SearchRequestSchema.safeParse(full).success).toBe(true)
  })
})

describe('UploadResponseSchema', () => {
  it('accepts valid upload response', () => {
    const response = { uploadId: '550e8400-e29b-41d4-a716-446655440000', status: 'pending_review' }
    expect(UploadResponseSchema.safeParse(response).success).toBe(true)
  })

  it('rejects status other than pending_review', () => {
    const response = { uploadId: '550e8400-e29b-41d4-a716-446655440000', status: 'approved' }
    expect(UploadResponseSchema.safeParse(response).success).toBe(false)
  })
})

describe('ReviewStageSchema', () => {
  it('accepts all 7 review stages', () => {
    const stages = [
      'manifest_validation', 'security_scan', 'dependency_check',
      'quality_review', 'test_render', 'cataloging', 'embedding',
    ]
    stages.forEach(stage => {
      expect(ReviewStageSchema.safeParse(stage).success).toBe(true)
    })
  })

  it('rejects unknown stage', () => {
    expect(ReviewStageSchema.safeParse('unknown_stage').success).toBe(false)
  })
})

describe('ReviewEventSchema', () => {
  it('accepts in_progress event with progress', () => {
    const event = { stage: 'security_scan', status: 'in_progress', progress: 0.4 }
    expect(ReviewEventSchema.safeParse(event).success).toBe(true)
  })

  it('accepts complete/approved event with componentId', () => {
    const event = {
      stage: 'complete',
      status: 'complete',
      result: 'approved',
      componentId: '550e8400-e29b-41d4-a716-446655440000',
    }
    expect(ReviewEventSchema.safeParse(event).success).toBe(true)
  })

  it('accepts rejection event with reason', () => {
    const event = {
      stage: 'quality_review',
      status: 'failed',
      result: 'rejected',
      reason: 'STYLING_TOKEN_VIOLATION: bg-blue-500 used instead of bg-primary',
    }
    expect(ReviewEventSchema.safeParse(event).success).toBe(true)
  })

  it('rejects progress outside 0-1', () => {
    const event = { stage: 'security_scan', status: 'in_progress', progress: 1.5 }
    expect(ReviewEventSchema.safeParse(event).success).toBe(false)
  })
})

describe('CheckUpdatesResponseSchema', () => {
  it('accepts response with updates and revocations', () => {
    const response = {
      updates: [{
        id: '550e8400-e29b-41d4-a716-446655440000',
        currentVersion: '1.0.0',
        latestVersion: '1.1.0',
        changelog: 'Added dark mode support',
      }],
      revocations: [{
        id: '550e8400-e29b-41d4-a716-446655440001',
        reason: 'security',
        message: 'Component contained malicious code',
      }],
    }
    expect(CheckUpdatesResponseSchema.safeParse(response).success).toBe(true)
  })

  it('accepts empty updates and revocations', () => {
    expect(CheckUpdatesResponseSchema.safeParse({ updates: [], revocations: [] }).success).toBe(true)
  })
})

describe('RateComponentRequestSchema', () => {
  it('accepts valid rating', () => {
    expect(RateComponentRequestSchema.safeParse({ rating: 4 }).success).toBe(true)
    expect(RateComponentRequestSchema.safeParse({ rating: 5, comment: 'Great component!' }).success).toBe(true)
  })

  it('rejects rating outside 1-5', () => {
    expect(RateComponentRequestSchema.safeParse({ rating: 0 }).success).toBe(false)
    expect(RateComponentRequestSchema.safeParse({ rating: 6 }).success).toBe(false)
  })

  it('rejects comment over 500 chars', () => {
    expect(RateComponentRequestSchema.safeParse({ rating: 3, comment: 'a'.repeat(501) }).success).toBe(false)
  })
})

describe('ApiErrorSchema', () => {
  it('accepts valid error envelope', () => {
    const err = {
      error: { code: 'NOT_FOUND', message: 'Component not found' },
      statusCode: 404,
    }
    expect(ApiErrorSchema.safeParse(err).success).toBe(true)
  })

  it('accepts error with details', () => {
    const err = {
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: { field: 'name' } },
      statusCode: 400,
    }
    expect(ApiErrorSchema.safeParse(err).success).toBe(true)
  })
})

describe('ErrorCodeSchema', () => {
  it('accepts all known error codes', () => {
    const codes = [
      'AUTH_REQUIRED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR',
      'MANIFEST_INVALID', 'UPLOAD_TOO_LARGE', 'REVIEW_REJECTED', 'RATE_LIMITED',
      'SERVER_ERROR', 'TOO_MANY_DATA_SOURCES', 'STYLING_TOKEN_VIOLATION',
    ]
    codes.forEach(code => {
      expect(ErrorCodeSchema.safeParse(code).success).toBe(true)
    })
  })

  it('rejects unknown error code', () => {
    expect(ErrorCodeSchema.safeParse('UNKNOWN_CODE').success).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npm test -- src/schemas/api.test.ts`

Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/schemas/api.ts src/schemas/api.test.ts
git commit -m "feat: add API request/response schemas with tests"
```

---

## Task 6: Types Index + Public Entry Point

**Files:**
- Create: `src/types/index.ts`
- Create: `src/index.ts`

- [ ] **Step 1: Create src/types/index.ts**

```typescript
// All types are inferred from Zod schemas — never hand-written
// This guarantees runtime validation and TypeScript types are always in sync
import type { z } from 'zod'

import type {
  ComponentManifestSchema,
  ComponentPackageSchema,
  FieldTypeSchema,
  InputFieldSchema,
  OutputFieldSchema,
  EventSchema,
  ActionSchema,
  FileEntrySchema,
  DataSourceSchema,
  EndpointSchema,
  UserConfigFieldSchema,
  SizeSchema,
} from '../schemas/manifest'

import type {
  CheckpointUploadSchema,
  CheckpointMetaSchema,
  CheckpointListResponseSchema,
  CheckpointTriggerSchema,
} from '../schemas/checkpoint'

import type {
  RegisterResponseSchema,
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

// Manifest types
export type ComponentManifest = z.infer<typeof ComponentManifestSchema>
export type ComponentPackage = z.infer<typeof ComponentPackageSchema>
export type FieldType = z.infer<typeof FieldTypeSchema>
export type InputField = z.infer<typeof InputFieldSchema>
export type OutputField = z.infer<typeof OutputFieldSchema>
export type ComponentEvent = z.infer<typeof EventSchema>
export type ComponentAction = z.infer<typeof ActionSchema>
export type FileEntry = z.infer<typeof FileEntrySchema>
export type DataSource = z.infer<typeof DataSourceSchema>
export type Endpoint = z.infer<typeof EndpointSchema>
export type UserConfigField = z.infer<typeof UserConfigFieldSchema>
export type ComponentSize = z.infer<typeof SizeSchema>

// Checkpoint types
export type CheckpointUpload = z.infer<typeof CheckpointUploadSchema>
export type CheckpointMeta = z.infer<typeof CheckpointMetaSchema>
export type CheckpointListResponse = z.infer<typeof CheckpointListResponseSchema>
export type CheckpointTrigger = z.infer<typeof CheckpointTriggerSchema>

// API types
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>
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

- [ ] **Step 2: Create src/index.ts**

```typescript
// Single public entry point for @cslate/shared
// Import schemas for runtime validation: import { ComponentManifestSchema } from '@cslate/shared'
// Import types for TypeScript: import type { ComponentManifest } from '@cslate/shared'
export * from './schemas/manifest'
export * from './schemas/checkpoint'
export * from './schemas/api'
export * from './types'
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: Zero TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/index.ts
git commit -m "feat: add type exports and public entry point"
```

---

## Task 7: Build Verification

**Files:**
- Verify: `dist/index.js` (ESM)
- Verify: `dist/index.cjs` (CJS)
- Verify: `dist/index.d.ts` (types)

- [ ] **Step 1: Run full build**

Run: `npm run build`

Expected output:
```
ESM dist/index.js
CJS dist/index.cjs
DTS dist/index.d.ts
```
No errors.

- [ ] **Step 2: Run all tests**

Run: `npm test`

Expected: All tests pass. Sample output:
```
✓ src/schemas/manifest.test.ts (14 tests)
✓ src/schemas/checkpoint.test.ts (8 tests)
✓ src/schemas/api.test.ts (18 tests)
```

- [ ] **Step 3: Verify ESM export works**

Run: `node --input-type=module -e "import { ComponentManifestSchema } from './dist/index.js'; console.log(typeof ComponentManifestSchema.parse)"`

Expected: `function`

- [ ] **Step 4: Verify CJS export works**

Run: `node -e "const { ComponentManifestSchema } = require('./dist/index.cjs'); console.log(typeof ComponentManifestSchema.parse)"`

Expected: `function`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "build: verify dual ESM/CJS output and all tests passing"
```

---

## Task 8: Cross-Repo Integration Notes

**Files:**
- Create: `docs/decisions/003-consuming-this-package.md`

- [ ] **Step 1: Write consumer guide decision doc**

Create `docs/decisions/003-consuming-this-package.md`:

```markdown
# Decision 003: How Consuming Repos Use @cslate/shared

**Date:** 2026-03-28
**Status:** Accepted

## Local Development (Before Publishing)

Both CSlate and CSlate-Server use a local file reference during development:

```json
// In CSlate/package.json or CSlate-Server/package.json:
"@cslate/shared": "file:../CSlate-shared"
```

After changing schemas in CSlate-shared, run `npm run build` here first,
then the consuming repo picks up changes automatically (it imports from `dist/`).

## CSlate (Electron Client) Usage

```typescript
// Validate manifest before uploading to community
import { ComponentManifestSchema } from '@cslate/shared'

const result = ComponentManifestSchema.safeParse(manifest)
if (!result.success) {
  // Show validation errors to user before allowing upload
  return { error: result.error.flatten() }
}

// Strip sensitive userConfig fields before community upload
const safeManifest = {
  ...result.data,
  userConfig: result.data.userConfig
    ? Object.fromEntries(
        Object.entries(result.data.userConfig).filter(([, v]) => !v.sensitive)
      )
    : undefined,
}
```

## CSlate-Server Usage

```typescript
// Stage 1 of review pipeline — manifest validation
import { ComponentManifestSchema, ReviewStageSchema } from '@cslate/shared'

const result = ComponentManifestSchema.safeParse(incoming.manifest)
if (!result.success) {
  return { code: 'MANIFEST_INVALID', errors: result.error.flatten() }
}

// Use ReviewStageSchema as authoritative stage list — never duplicate the enum
const stages = ReviewStageSchema.options  // ['manifest_validation', 'security_scan', ...]
```

## Published Package (Production)

```json
"@cslate/shared": "^0.1.0"
```

Publish: `npm publish` from this repo after all tests pass.
Consumers pin with `^0.1.0` for patch + minor updates, manual upgrade for breaking changes.

## Versioning Policy

- **Patch** (0.1.x): Bug fixes in validation logic, typo fixes in descriptions
- **Minor** (0.x.0): New optional schema fields, new schemas (backwards compatible)
- **Major** (x.0.0): Removing fields, changing field types, renaming schemas

Both CSlate and CSlate-Server must update to the same major version together.
```

- [ ] **Step 2: Commit**

```bash
git add docs/decisions/003-consuming-this-package.md
git commit -m "docs: add consumer integration guide for CSlate and CSlate-server"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `ComponentManifestSchema` with all fields including `dataSources` max-5 rule — Task 3
- ✅ `ComponentPackageSchema` — Task 3
- ✅ Checkpoint schemas (upload, meta, list) — Task 4
- ✅ API schemas (search, upload, SSE, errors, rating, abuse) — Task 5
- ✅ `z.infer<>` type exports, no hand-written interfaces — Task 6
- ✅ Public `src/index.ts` entry — Task 6
- ✅ `package.json`, `tsconfig.json`, `tsup.config.ts` — Task 1
- ✅ Dual ESM + CJS build verification — Task 7
- ✅ Design decisions documented in `docs/decisions/` — Tasks 2 + 8
- ✅ API contract reference — Task 2
- ✅ Cross-repo consumer guide — Task 8
- ✅ TDD with happy path + rejection tests for all 3 schema files — Tasks 3-5

**Type consistency check:**
- `EndpointSchema` exported from manifest.ts and referenced in types/index.ts ✅
- `CheckpointTriggerSchema` defined in checkpoint.ts, referenced in types/index.ts ✅
- `minimalManifest` in api.test.ts uses same shape as manifest.test.ts ✅
