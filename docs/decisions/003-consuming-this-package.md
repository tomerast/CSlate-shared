# Decision 003: How Consuming Repos Use @cslate/shared

**Date:** 2026-03-28
**Status:** Accepted

## GitHub Reference (Not npm Registry)

Both CSlate and CSlate-Server reference this package directly from GitHub:

```json
"@cslate/shared": "github:tomerast/CSlate-shared"
```

npm automatically runs the `prepare` script on install-from-GitHub, which triggers `npm run build` and produces `dist/`. This means:
- No need to commit `dist/` to git
- Consumers always build from source on install
- Works in CI without any extra steps
- When new changes are pushed, consumers run `npm install` (or `npm update @cslate/shared`) to pick them up

Once stable, pin to a tag:
```json
"@cslate/shared": "github:tomerast/CSlate-shared#v0.1.0"
```

## CSlate (Electron Client) Usage

```typescript
// Validate manifest before uploading to community — same schema as server
import { ComponentManifestSchema } from '@cslate/shared'
import type { ComponentManifest } from '@cslate/shared'

const result = ComponentManifestSchema.safeParse(manifest)
if (!result.success) {
  return { error: result.error.flatten() }
}

// Strip sensitive userConfig fields before community upload
const safeManifest: ComponentManifest = {
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
const stages = ReviewStageSchema.options
// ['manifest_validation', 'security_scan', 'dependency_check',
//  'quality_review', 'test_render', 'cataloging', 'embedding']
```

## Versioning Policy

- **Patch** (0.1.x): Bug fixes in validation logic, typo fixes
- **Minor** (0.x.0): New optional fields, new schemas (backwards compatible)
- **Major** (x.0.0): Removing fields, changing types, renaming schemas

Both CSlate and CSlate-Server must update to the same major version together.

## License

Apache-2.0. Matches CSlate and CSlate-Server.
