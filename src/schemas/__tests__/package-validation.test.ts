// src/schemas/__tests__/package-validation.test.ts
import { describe, it, expect } from 'vitest'
import { validateComponentPackage } from '../manifest'

// Minimal valid manifest for tests
const VALID_MANIFEST = {
  name: 'Test',
  description: 'A test component',
  tags: ['test'],
  inputs: {},
  outputs: {},
  events: {},
  actions: {},
  files: [{ path: 'ui.tsx', type: 'ui', role: 'main render' }],
  defaultSize: { width: 30, height: 25 },
}

describe('validateComponentPackage', () => {
  it('accepts valid package with ui.tsx', () => {
    const result = validateComponentPackage({
      manifest: VALID_MANIFEST,
      files: { 'ui.tsx': 'export default () => null' },
    })
    expect(result.valid).toBe(true)
  })

  it('accepts package with subdirectories', () => {
    const result = validateComponentPackage({
      manifest: VALID_MANIFEST,
      files: {
        'ui.tsx': 'export default () => null',
        'hooks/useData.ts': 'export function useData() {}',
        'utils/format.ts': 'export function fmt() {}',
      },
    })
    expect(result.valid).toBe(true)
  })

  it('rejects package missing ui.tsx', () => {
    const result = validateComponentPackage({
      manifest: VALID_MANIFEST,
      files: { 'logic.ts': 'export const x = 1' },
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.stringContaining('ui.tsx is required'))
  })

  it('rejects path traversal', () => {
    const result = validateComponentPackage({
      manifest: VALID_MANIFEST,
      files: { 'ui.tsx': 'export default () => null', '../evil.ts': 'bad' },
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.stringContaining('Path traversal'))
  })

  it('rejects absolute paths', () => {
    const result = validateComponentPackage({
      manifest: VALID_MANIFEST,
      files: { 'ui.tsx': 'export default () => null', '/etc/passwd': 'bad' },
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.stringContaining('Absolute paths'))
  })

  it('rejects null bytes in path', () => {
    const result = validateComponentPackage({
      manifest: VALID_MANIFEST,
      files: { 'ui.tsx': 'export default () => null', 'evil\0.ts': 'bad' },
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContainEqual(expect.stringContaining('Null bytes'))
  })

  it('rejects invalid manifest', () => {
    const result = validateComponentPackage({
      manifest: { name: '' }, // invalid: name too short, missing required fields
      files: { 'ui.tsx': 'export default () => null' },
    })
    expect(result.valid).toBe(false)
  })
})
