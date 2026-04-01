import { describe, it, expect } from 'vitest'
import { COMPONENT_TEMPLATE } from '../component'
import { ComponentManifestSchema } from '../../schemas/manifest'

describe('COMPONENT_TEMPLATE', () => {
  it('has entries for all five expected files', () => {
    expect(Object.keys(COMPONENT_TEMPLATE)).toEqual(
      expect.arrayContaining(['ui.tsx', 'logic.ts', 'types.ts', 'manifest.json', 'context.md'])
    )
  })

  it('ui.tsx has a default export', () => {
    expect(COMPONENT_TEMPLATE['ui.tsx']).toContain('export default function')
  })

  it('ui.tsx imports from ./types and ./logic', () => {
    expect(COMPONENT_TEMPLATE['ui.tsx']).toContain("from './types'")
    expect(COMPONENT_TEMPLATE['ui.tsx']).toContain("from './logic'")
  })

  it('ui.tsx has loading, error, and success branches', () => {
    const ui = COMPONENT_TEMPLATE['ui.tsx']
    expect(ui).toContain("status === 'loading'")
    expect(ui).toContain("status === 'error'")
    expect(ui).toContain("status === 'success'")
  })

  it('ui.tsx error state has role="alert" for accessibility', () => {
    expect(COMPONENT_TEMPLATE['ui.tsx']).toContain('role="alert"')
  })

  it('logic.ts exports useComponentData', () => {
    expect(COMPONENT_TEMPLATE['logic.ts']).toContain('export function useComponentData')
  })

  it('logic.ts uses discriminated union DataState (not separate loading/error booleans)', () => {
    const logic = COMPONENT_TEMPLATE['logic.ts']
    expect(logic).toContain("status: 'loading'")
    expect(logic).toContain("status: 'success'")
    expect(logic).toContain("status: 'error'")
    expect(logic).not.toContain('loading: true')
    expect(logic).not.toContain('loading: false')
  })

  it('types.ts exports DataState as a discriminated union', () => {
    const types = COMPONENT_TEMPLATE['types.ts']
    expect(types).toContain("export type DataState")
    expect(types).toContain("status: 'idle'")
    expect(types).toContain("status: 'loading'")
    expect(types).toContain("status: 'success'")
    expect(types).toContain("status: 'error'")
  })

  it('types.ts exports Properties with bridge and store', () => {
    const types = COMPONENT_TEMPLATE['types.ts']
    expect(types).toContain('export type Properties')
    expect(types).toContain('bridge: BridgeApi')
    expect(types).toContain('store: StoreApi')
  })

  it('manifest.json is valid JSON', () => {
    expect(() => JSON.parse(COMPONENT_TEMPLATE['manifest.json'])).not.toThrow()
  })

  it('manifest.json passes ComponentManifestSchema validation', () => {
    const manifest = JSON.parse(COMPONENT_TEMPLATE['manifest.json'])
    const result = ComponentManifestSchema.safeParse(manifest)
    expect(result.success).toBe(true)
  })

  it('manifest.json files array includes ui.tsx', () => {
    const manifest = JSON.parse(COMPONENT_TEMPLATE['manifest.json'])
    const filePaths = manifest.files.map((f: { path: string }) => f.path)
    expect(filePaths).toContain('ui.tsx')
  })

  it('context.md is a structured markdown template', () => {
    const ctx = COMPONENT_TEMPLATE['context.md']
    expect(ctx).toContain('## What was built')
    expect(ctx).toContain('## Why / user request')
    expect(ctx).toContain('## Data sources')
    expect(ctx).toContain('## Inter-component connections')
    expect(ctx).toContain('## Known limitations')
  })

  it('all template files are non-empty strings', () => {
    for (const [file, content] of Object.entries(COMPONENT_TEMPLATE)) {
      expect(typeof content, `${file} must be a string`).toBe('string')
      expect(content.trim().length, `${file} must not be empty`).toBeGreaterThan(0)
    }
  })
})
