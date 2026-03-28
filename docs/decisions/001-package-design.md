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
tsup compiles `src/index.ts` to both `dist/index.js` (ESM) and `dist/index.cjs` (CJS) with a single `dist/index.d.ts` type declaration. The `exports` field in `package.json` routes consumers to the correct format automatically. The `"types"` condition is listed first in the exports map — required by TypeScript's resolution algorithm.

**Why not ESM-only:** CSlate-Server may run in a CJS context during test/development; forcing ESM breaks `require()` in older toolchains.

### `prepare` script for GitHub installation
Both CSlate and CSlate-Server reference this package directly from GitHub (`github:tomerast/CSlate-shared`). npm automatically runs `prepare` on install-from-GitHub, which triggers `npm run build` and produces `dist/`. This means consumers always get a fresh, built package without needing `dist/` committed to git.

### No hand-written TypeScript interfaces
All exported types are `z.infer<typeof SomeSchema>`. This guarantees the runtime Zod schema and the TypeScript type are always in sync. A hand-written interface can drift from the schema; an inferred type cannot.

### TypeScript strict mode + isolatedModules
Catches null/undefined bugs at compile time. Both consuming repos already use strict mode — this package matches that baseline. `isolatedModules: true` is added because tsup uses esbuild internally (per-file transpilation without full type context) — this flag ensures TypeScript warns about patterns esbuild can't safely handle.

### Apache-2.0 license
Matches the CSlate and CSlate-Server repositories.
