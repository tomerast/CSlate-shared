# CSlate Shared — Continuity Guide

**Scope:** `CSlate-shared` / npm package `@cslate/shared`  
**Last reviewed:** 2026-04-24  
**Purpose:** document the package concept, boundaries, exported contracts, architecture decisions, and cross-repo risks for future development.

---

## Package Role

`@cslate/shared` is the common package used by CSlate repos for runtime schemas, inferred TypeScript types, component templates, and shared agent infrastructure.

It should contain code that is genuinely cross-repo:

1. Zod schemas and inferred types for shared payloads.
2. Component and pipeline package validation helpers.
3. API request/response schemas where both client and server need the shape.
4. Agent infrastructure used by both the desktop client and server reviewer agents.
5. Templates that are useful to component-building agents across repos.

It should not become a dumping ground for app-specific runtime behavior.

---

## Repository Shape

```text
src/
  index.ts                    main public entrypoint
  schemas/
    manifest.ts               client-side component package schema
    pipeline-manifest.ts      pipeline package schema
    checkpoint.ts             checkpoint backup schemas
    api.ts                    API request/response and review-event schemas
  templates/
    component.ts              default generated component file templates
  types/
    index.ts                  z.infer<> type exports
  agent/
    index.ts                  agent subpath public entrypoint
    providers.ts              provider registry and model id helpers
    loop.ts                   AI SDK wrappers
    tools/types.ts            CSTool abstraction
    lib/                      compaction, result budgeting, fence stripping, abort helpers
```

Package entrypoints:

```ts
import { ComponentManifestSchema } from '@cslate/shared'
import { buildRegistry, runAgentStream } from '@cslate/shared/agent'
```

Build output is dual ESM/CJS through `tsup` with declarations under `dist/`.

---

## Public Entry Point: `@cslate/shared`

The main entrypoint exports:

- component manifest schemas and `validateComponentPackage`
- pipeline manifest schemas and `validatePipelinePackage`
- checkpoint schemas
- API schemas
- inferred schema types
- default component templates

The package follows the rule: all exported types that mirror runtime data should be inferred from Zod schemas, not hand-written interfaces.

---

## Public Entry Point: `@cslate/shared/agent`

The agent subpath exports shared LLM plumbing:

- `buildRegistry(config)`
- `mainModelId(config)`
- `fastModelId(config)`
- `runAgentStream(params)`
- `runSubAgent(params)`
- `runStructuredAgent(params)`
- `buildTool(def)` and `toAISDKTools(tools)`
- `autoCompactIfNeeded`, `estimateTokens`, `budgetToolResult`, `stripFences`, `createChildAbortController`

Consumers:

- `CSlate` uses it for router classification, render decisions, direct chat, orchestration, and sub-agents.
- `CSlate-server` uses it inside the reviewer-agent package for agent tools, sub-agent calls, and provider registry setup.

---

## Agent Infrastructure

### Provider Registry

`src/agent/providers.ts` creates a Vercel AI SDK provider registry for:

- Anthropic
- OpenAI
- Google
- local Ollama-compatible providers

Important decisions:

- OpenAI is patched to call `p.chat(id)` so gateways that support Chat Completions but not Responses API keep working.
- Ollama is cast to the provider version expected by AI SDK registry APIs.
- `mainModelId()` and `fastModelId()` return provider-prefixed IDs like `anthropic:claude-...`.

### AI SDK Wrappers

`src/agent/loop.ts` wraps AI SDK primitives:

- `runAgentStream` wraps `streamText` for tool-using streaming agents and supports `prepareStep` and `onStepFinish`.
- `runSubAgent` wraps `generateText` for one-shot expert/builder/judge agents.
- `runStructuredAgent` wraps `generateObject` for routers and classifiers.

Keep these wrappers thin. They are cross-repo infrastructure, not product-specific orchestration.

### Tool Abstraction

`CSTool` provides a consistent structure around AI SDK tools:

- Zod `inputSchema`
- `call()` returning `{ data }`
- read-only and concurrency metadata
- optional input validation
- max result-size metadata
- `toAISDKTool()` conversion

The current conversion passes a minimal `ToolUseContext` with `projectDir: ''` and `abortSignal`. Repo-specific tools that need real project paths close over those paths when they are created.

---

## Component Package Schema

`src/schemas/manifest.ts` defines the client-oriented component package contract.

A component package contains:

- `manifest`: identity, data interface, files, optional dependencies/data sources/user config/AI hints, and layout size.
- `files`: path-to-content map with at least `ui.tsx`.

Validation rules include:

- `ui.tsx` is required.
- paths cannot include `..`, absolute paths, or null bytes.
- `dataSources` are capped at 5.
- `userConfig.sensitive` marks fields that must not be shared to the community library.

This schema matches the package format local client agents generate and validate before bundling.

---

## Pipeline Package Schema

`src/schemas/pipeline-manifest.ts` defines a pipeline package:

- `manifest`: name, description, tags, secrets, params, output schema, strategy, files, optional version.
- `files`: path-to-content map with required `pipeline.ts`.
- `PipelineOutputSchema`: `{ data, metadata: { fetchedAt, source, cached } }`.

Pipeline strategies are:

- `on-demand`
- `polling`
- `streaming`

Path traversal checks mirror component package checks.

---

## API Schemas

`src/schemas/api.ts` contains schemas for:

- auth registration response
- component search request/response
- upload response
- component and pipeline source responses
- review event shapes
- update/revocation checks
- rating/report payloads
- error envelopes and known error codes

These schemas are useful for typed clients and tests, but they must be kept aligned with actual server behavior. When server route output changes, update these schemas in the same cross-repo change.

---

## Templates

`src/templates/component.ts` exports `COMPONENT_TEMPLATE` with starter files for generated components:

- `ui.tsx`
- `logic.ts`
- `types.ts`
- `manifest.json`
- `context.md`

The desktop orchestrator uses these as fallback starting points when no strong community blueprint exists. Templates should remain conservative, semantic-token compliant, and aligned with the real sandbox bridge.

---

## Cross-Repo Contract Reality

There is an important current mismatch:

- `@cslate/shared` defines the client/local component schema using records for `inputs`, `outputs`, `events`, `actions`, record-shaped `dataSources`, and file entries with path/type/role.
- `CSlate-server/packages/pipeline/src/types.ts` defines a server upload/review component schema with `title`, semver `version`, arrays for several interface fields, simple array `dataSources`, and `files` as string paths.

This means the shared package is not yet the only manifest source of truth for server upload review. Treat this as a known contract debt. Before enabling client auto-publish, either:

1. Move the server upload schema into `@cslate/shared`, or
2. Add an explicit normalizer with tests that converts client packages to server upload packages.

Do not rely on matching schema names alone.

---

## Architecture Decisions

### ADR-H1: Zod schemas are the runtime contract

Types are inferred from schemas so validation and TypeScript do not drift. Avoid exported hand-written interfaces for payloads that cross repo boundaries.

### ADR-H2: Two entrypoints keep dependencies understandable

The main entrypoint is data contracts/templates. The `./agent` subpath is LLM infrastructure. Consumers can import one without mentally mixing concerns.

### ADR-H3: Provider quirks are centralized

Gateway compatibility and local-provider casts live in one package. Client and server agents should not each patch providers differently.

### ADR-H4: Agent wrappers stay product-neutral

`runAgentStream`, `runSubAgent`, and `runStructuredAgent` should not know about CSlate routing, review phases, Electron, Hono, or storage. Product orchestration belongs in consuming repos.

### ADR-H5: Templates are scaffolds, not framework policy

Templates give agents a safe starting shape. They should not force every generated component into unnecessary files or business logic if a simple `ui.tsx` plus `manifest.json` is enough.

### ADR-H6: Version changes must be coordinated

Major schema changes require coordinated updates in CSlate client and CSlate server. Patch/minor changes should prefer optional additions and backwards-compatible validators.

---

## Development Rules

- Keep Zod v3 compatibility unless both consumers intentionally migrate.
- Export runtime schemas and inferred types together.
- Add tests for every new schema rule and validation helper.
- Keep API schemas aligned with server route behavior.
- Keep agent wrappers small and generic.
- Do not import Electron, Hono, Drizzle, or app-specific modules here.
- Treat schema renames/removals as multi-repo work.

---

## Known Gaps

- `AGENT_CONTEXT.md` describes an older canvas-first product. Prefer this guide for current chat-portal context.
- `ReviewStageSchema` still describes the older seven-stage component review sequence, while the server runner currently uses `manifest_validation`, `dependency_check`, `agent_review`, `cataloging`, and `embedding`.
- Shared schemas do not yet include `AgentMessage` and `Session`; the client mirrors them locally in `CSlate/src/shared/agentTypes.ts`.
- Server upload manifests currently use package-local schemas instead of this package’s component schema.

---

## Validation Commands

```bash
npm run test
npm run typecheck
npm run build
npm run prepublishOnly
```

Run tests before publishing or before updating downstream repos to a new commit/tag.
