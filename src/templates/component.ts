/**
 * Default component file templates.
 *
 * Patterns sourced from:
 * - bulletproof-react (discriminated union state, three-branch guard, keyof typeof variants)
 * - thecodingmachine/react-native-boilerplate (readonly Properties, hook-as-namespace, hoisted helpers)
 * - react.dev 2024 (function declarations, no React.FC, no return type annotation)
 * - jsynowiec/node-typescript-boilerplate (noImplicitReturns, noUnusedLocals strictness)
 *
 * Used by sub-agents as a STARTING POINT when no community blueprint is found.
 * Sub-agents adapt the content for the specific component they're building.
 */

const UI_TSX = `import React from 'react'
import type { Properties } from './types'
import { useComponentData } from './logic'

// TODO: rename Component to a descriptive PascalCase name matching the manifest name
export default function Component({ bridge, store }: Properties) {
  const state = useComponentData(bridge)

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="animate-pulse text-muted text-sm">Loading\u2026</div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <p className="text-error text-sm" role="alert">{state.error}</p>
      </div>
    )
  }

  // state.status === 'success': TypeScript narrows here — state.data is available
  return (
    <div className="h-full bg-background p-4">
      {/* TODO: render state.data */}
    </div>
  )
}
`

const LOGIC_TS = `import { useState, useEffect, useCallback } from 'react'
import type { Properties, DataState } from './types'

// Hoisted pure helper — declared at module scope so it is not recreated on every render.
// TODO: replace with actual data transformation for this component's data shape.
function parseResponse(raw: unknown): unknown {
  return raw
}

export function useComponentData(bridge: Properties['bridge']): DataState {
  const [state, setState] = useState<DataState>({ status: 'idle' })

  const load = useCallback(() => {
    setState({ status: 'loading' })
    // TODO: replace 'sourceId' and 'endpointId' with the values declared in manifest.json dataSources.
    bridge
      .fetch('sourceId', 'endpointId', {})
      .then(raw => setState({ status: 'success', data: parseResponse(raw) }))
      .catch(err => setState({ status: 'error', error: err instanceof Error ? err.message : String(err) }))
  }, [bridge])

  useEffect(() => {
    load()
  }, [load])

  return state
}
`

const TYPES_TS = `// Component-specific types — rename and expand as needed.
// Ordering: primitive API types → domain types → component props (Properties last).

// External data channel — do not rename bridge or its methods; other components depend on this contract.
export type BridgeApi = {
  readonly fetch: (sourceId: string, endpointId: string, params?: Record<string, unknown>) => Promise<unknown>
  readonly subscribe: (
    sourceId: string,
    endpointId: string,
    params: Record<string, unknown>,
    callback: (data: unknown) => void,
  ) => () => void
  readonly getConfig: (key: string) => string | undefined
}

// Inter-component state channel — do not rename store or its methods.
export type StoreApi = {
  readonly get: (key: string) => unknown
  readonly set: (key: string, value: unknown) => void
}

// Discriminated union for async state — prevents impossible states (loading + data simultaneously).
// TypeScript narrows in each branch: inside status === 'success', data is guaranteed present.
// TODO: replace the \`unknown\` generic with the actual data type for this component.
export type DataState<T = unknown> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: string }

// Component props — always named Properties, all fields readonly.
// TODO: add component-specific props here (e.g. title, config values from manifest inputs).
export type Properties = {
  readonly bridge: BridgeApi
  readonly store: StoreApi
}
`

const MANIFEST_JSON = JSON.stringify(
  {
    name: 'Component Name',
    description: 'What this component does in 1-2 sentences.',
    tags: [],
    inputs: {},
    outputs: {},
    events: {},
    actions: {},
    files: [
      { path: 'ui.tsx', type: 'ui', role: 'main render' },
      { path: 'logic.ts', type: 'logic', role: 'data hooks' },
      { path: 'types.ts', type: 'types', role: 'shared interfaces' },
      { path: 'context.md', type: 'other', role: 'agent context' },
    ],
    defaultSize: { width: 30, height: 25 },
  },
  null,
  2,
)

const CONTEXT_MD = `## What was built
<!-- 1-2 sentences: component name and primary function -->

## Why / user request
<!-- What the user asked for that produced this component -->

## Data sources
<!-- bridge.fetch calls: sourceId, endpointId, expected data shape. Or "none" -->

## Inter-component connections
<!-- store keys read/written; events emitted/handled. Or "none" -->

## Known limitations
<!-- edge cases not handled, missing features. Or "none" -->
`

/**
 * Default starter file contents for a CSlate component package.
 *
 * Keys match the file paths used in a component package (e.g. "ui.tsx", "logic.ts").
 * Sub-agents receive these as a STARTING POINT when no community blueprint is found.
 * Files not present in this map are built from scratch.
 *
 * Note: manifest.json lists logic.ts and types.ts in its files array.
 * Sub-agents should remove those entries if they do not produce those files.
 */
export const COMPONENT_TEMPLATE: Record<string, string> = {
  'ui.tsx': UI_TSX,
  'logic.ts': LOGIC_TS,
  'types.ts': TYPES_TS,
  'manifest.json': MANIFEST_JSON,
  'context.md': CONTEXT_MD,
}
