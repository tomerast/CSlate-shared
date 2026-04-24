# CSlate-Shared — Implementation Spec

> Current implementation continuity lives in `docs/continuity.md`. This file is useful background, but any conflict with `docs/continuity.md` or live code should be treated as historical and corrected.

**Repo:** `CSlate-shared` → npm package `@cslate/shared`  
**Date:** 2026-04-24

---

## Overview

`@cslate/shared` is the single source of truth for all data contracts between the CSlate client and server. Neither repo defines these types independently — both import from this package.

**Rule:** If a type or schema is used by both `CSlate` and `CSlate-server`, it lives here. If it's internal to one repo, it stays in that repo.

---

## What Lives Here

| Schema | Used By |
|---|---|
| `ComponentManifest` | Client (render, upload), Server (review, search) |
| `ComponentPackage` | Client (upload payload), Server (store/serve) |
| `CheckpointUpload` | Client (upload), Server (store) |
| API request/response shapes | Client (typed HTTP calls), Server (typed handlers) |
| Review stage enum | Client (SSE display), Server (pipeline stages) |
| Error codes | Client (error handling), Server (error responses) |

---

## What Does NOT Live Here

| Type | Lives In |
|---|---|
| `AgentRequest` / `AgentResponse` / `AgentMessage` | `CSlate/src/shared/agentTypes.ts` — internal IPC types |
| Drizzle DB schema | `CSlate-server/packages/db/` |
| LLM provider config | `CSlate/src/main/agent/lib/` |
| Component bundle execution | `CSlate/src/renderer/sandbox/` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript 5.4 strict |
| Schemas | Zod v3 (pinned — server uses v3, not v4) |
| AI SDK | Vercel AI SDK v6 (`ai`) |
| LLM providers | `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `ollama-ai-provider` |
| Build | tsup 8 (dual ESM + CJS output + `.d.ts`) |
| Tests | Vitest 1 |

---

## Package Structure

```
src/
  schemas/
    manifest.ts           ComponentManifest + ComponentPackage (Zod)
    pipeline-manifest.ts  PipelineManifest + PipelinePackage (Zod)
    checkpoint.ts         CheckpointUpload + CheckpointMeta (Zod)
    api.ts                All API request/response schemas (Zod)
  templates/
    component.ts          Component scaffold template string (used by component-builder)
  types/
    index.ts              All z.infer<> type exports (no hand-written interfaces)
  agent/
    providers.ts          buildRegistry(), mainModelId(), fastModelId()
    loop.ts               runAgentStream(), runSubAgent(), runStructuredAgent()
    tools/types.ts        CSTool, buildTool, toAISDKTools
    lib/
      compact.ts          autoCompactIfNeeded, estimateTokens, shouldCompact
      result-budget.ts    budgetToolResult
      strip-fences.ts     stripFences
      abort-utils.ts      createChildAbortController
    index.ts              Public agent entry
  index.ts                Main entry — re-exports schemas + types + templates
```

---

## Two Entry Points

```typescript
// Main — schemas, types, templates
import { ComponentManifestSchema, PipelineManifestSchema } from '@cslate/shared'
import type { ComponentManifest } from '@cslate/shared'

// Agent infrastructure — used by both CSlate client and CSlate-server pipeline
import { buildRegistry, runAgentStream, runSubAgent, runStructuredAgent } from '@cslate/shared/agent'
import type { LLMConfig, AgentRegistry } from '@cslate/shared/agent'
```

---

## The ComponentManifest Schema

The most critical schema. Every UI component carries one.

**Top-level fields:**

| Field | Required | Description |
|---|---|---|
| `id` | No (server assigns) | UUID assigned on first upload |
| `name` | Yes | Component display name |
| `description` | Yes | What it does and when to use it |
| `tags` | Yes (max 10) | Search + categorization labels |
| `version` | No (server assigns) | Semver, server-managed |
| `inputs` | Yes | Props the component accepts |
| `outputs` | Yes | Values the component writes (for wiring) |
| `events` | Yes | Fire-and-forget notifications emitted |
| `actions` | Yes | Imperative commands the component responds to |
| `files` | Yes | List of files in the package |
| `dataSources` | No (max 5) | External API declarations — gates data bridge |
| `userConfig` | No | User-configurable fields (API keys, settings) |
| `ai` | No (server-generated) | AI hints added at review Stage 6 |
| `defaultSize` | Yes | Grid units: `{ width, height }` |
| `minSize` | No | Minimum resize bound |

**Business rules:**
- `dataSources` max 5 → `TOO_MANY_DATA_SOURCES`
- `userConfig.sensitive = true` fields stripped by client before upload
- `ai` hints absent until server review Stage 6 completes
- `id` + `version` are server-assigned — absent before first upload

---

## The PipelineManifest Schema

For data pipeline packages (`pipeline.ts` entry required). Fields: `name`, `description`, `tags`, `secrets`, `params`, `outputSchema`, `strategy` (`on-demand` | `polling` | `streaming`), `files`.

`validatePipelinePackage(pkg)` returns a discriminated union result.

---

## The Agent Infrastructure (`@cslate/shared/agent`)

### `LLMConfig`
```typescript
interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'google' | 'local'
  model: string
  apiKey?: string
  baseUrl?: string    // for Ollama / custom gateway
  fastModel?: string  // fast model for classifier/sub-agents
}
```

### `buildRegistry(config: LLMConfig): AgentRegistry`
Creates a Vercel AI SDK `ProviderRegistry` for all 4 providers. OpenAI patched to Chat Completions for gateway compatibility. Ollama cast from ProviderV1 → ProviderV3.

### `runAgentStream(params): AgentStreamResult`
Wraps `streamText`. Returns `{ fullStream, text, usage, steps }`. Supports `prepareStep` (phase routing) and `onStepFinish`. Default `maxSteps: 15`, `maxOutputTokens: 16000`, `temperature: 0.2`.

### `runSubAgent(params): Promise<SubAgentResult>`
Wraps `generateText`. Returns `{ text, usage, steps }`. For expert/judge sub-agents with tool loops. Default `maxSteps: 8`, `maxOutputTokens: 12000`.

### `runStructuredAgent<T>(params): Promise<T>`
Wraps `generateObject`. Returns the parsed Zod-schema object. Used for intent classifiers and structured decisions.

### Utilities
- `autoCompactIfNeeded(messages)` — trims conversation before context limit
- `budgetToolResult(result, maxChars)` — prevents tool output context blowout
- `stripFences(text)` — removes markdown code fences from LLM output
- `createChildAbortController(parent?)` — child abort linked to parent signal
- `estimateTokens(text)` — rough token count estimate

---

## The Component Lifecycle Impact on Schemas

```
Client builds component locally
  → manifest: no id, no version, no ai hints

Client uploads (ComponentPackage)
  → Stage 1: ComponentManifestSchema.safeParse() → MANIFEST_INVALID if fails
  → Stage 6: server adds ai.modificationHints, ai.extensionPoints, ai.similarTo
  → server assigns id + version

Client fetches from server (ComponentPackage)
  → manifest has id, version, full ai hints
```

---

## Build & Publish

```bash
npm run build         # tsup → dist/ (ESM + CJS + .d.ts)
npm run typecheck     # tsc --noEmit
npm run test          # vitest run
npm publish           # @cslate/shared public scoped package
```

**tsup output:**
- `dist/index.js` / `dist/index.cjs` — main entry
- `dist/agent/index.js` / `dist/agent/index.cjs` — agent entry
- All `.d.ts` declaration files

**CSlate client installs via:**
```json
"@cslate/shared": "github:tomerast/CSlate-shared#main"
```

**CSlate-server installs via:**
```json
"@cslate/shared": "github:tomerast/CSlate-shared"
```

---

## Versioning Policy

- **Patch** — add optional fields, tighten validation, add utilities
- **Minor** — new schemas, new required fields with defaults, new agent functions
- **Major** — breaking schema changes (rename/remove required fields)

Both consumers must be updated in lockstep on major versions.

---

## Non-Negotiable Constraints

- Zod v3 only (server pinned to v3)
- All types are `z.infer<>` — no hand-written interfaces
- tsup dual ESM + CJS output
- No runtime deps except `zod`, `ai`, and the AI SDK provider packages
