import { describe, it, expect } from 'vitest'
import {
  PipelineManifestSchema,
  PipelineOutputSchema,
  PipelinePackageSchema,
  validatePipelinePackage,
} from './pipeline-manifest'

const minimalManifest = {
  name: 'Yahoo Stocks',
  description: 'Fetches real-time stock prices from Yahoo Finance',
  tags: ['finance', 'stocks'],
  secrets: {},
  params: {},
  outputSchema: {},
  strategy: { type: 'on-demand' },
  files: ['pipeline.ts', 'manifest.json'],
}

describe('PipelineManifestSchema', () => {
  it('accepts a minimal valid manifest', () => {
    const result = PipelineManifestSchema.safeParse(minimalManifest)
    expect(result.success).toBe(true)
  })

  it('accepts a full manifest with all optional fields', () => {
    const full = {
      ...minimalManifest,
      version: '1.0.0',
      secrets: {
        apiKey: { description: 'Yahoo Finance API key', required: true },
      },
      params: {
        symbol: { type: 'string', description: 'Stock ticker symbol', required: true, default: 'AAPL' },
        limit: { type: 'number', description: 'Number of results', required: false },
      },
      outputSchema: {
        price: { type: 'number', description: 'Current stock price' },
        symbol: { type: 'string', description: 'Stock symbol' },
      },
      strategy: { type: 'polling', intervalMs: 30000, cacheTtlMs: 10000 },
    }
    const result = PipelineManifestSchema.safeParse(full)
    expect(result.success).toBe(true)
  })

  it('accepts streaming strategy', () => {
    const result = PipelineManifestSchema.safeParse({
      ...minimalManifest,
      strategy: { type: 'streaming' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const { name: _, ...noName } = minimalManifest
    const result = PipelineManifestSchema.safeParse(noName)
    expect(result.success).toBe(false)
  })

  it('rejects invalid strategy type', () => {
    const result = PipelineManifestSchema.safeParse({
      ...minimalManifest,
      strategy: { type: 'cron' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid param type', () => {
    const result = PipelineManifestSchema.safeParse({
      ...minimalManifest,
      params: {
        bad: { type: 'array', description: 'bad', required: false },
      },
    })
    expect(result.success).toBe(false)
  })
})

describe('PipelineOutputSchema', () => {
  it('accepts valid pipeline output', () => {
    const result = PipelineOutputSchema.safeParse({
      data: { price: 150.5, symbol: 'AAPL' },
      metadata: {
        fetchedAt: Date.now(),
        source: 'Yahoo Finance API',
        cached: false,
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts null data', () => {
    const result = PipelineOutputSchema.safeParse({
      data: null,
      metadata: { fetchedAt: 1000, source: 'test', cached: true },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing metadata', () => {
    const result = PipelineOutputSchema.safeParse({ data: {} })
    expect(result.success).toBe(false)
  })

  it('rejects missing fetchedAt', () => {
    const result = PipelineOutputSchema.safeParse({
      data: {},
      metadata: { source: 'test', cached: false },
    })
    expect(result.success).toBe(false)
  })
})

describe('validatePipelinePackage', () => {
  it('accepts valid package with pipeline.ts', () => {
    const result = validatePipelinePackage({
      manifest: minimalManifest,
      files: {
        'pipeline.ts': 'export default class MyPipeline {}',
        'manifest.json': '{}',
      },
    })
    expect(result.valid).toBe(true)
  })

  it('rejects package missing pipeline.ts', () => {
    const result = validatePipelinePackage({
      manifest: minimalManifest,
      files: { 'transform.ts': 'export const x = 1' },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toContainEqual(expect.stringContaining('pipeline.ts is required'))
    }
  })

  it('rejects path traversal', () => {
    const result = validatePipelinePackage({
      manifest: minimalManifest,
      files: { 'pipeline.ts': 'export default class {}', '../evil.ts': 'bad' },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toContainEqual(expect.stringContaining('Path traversal'))
    }
  })

  it('rejects absolute paths', () => {
    const result = validatePipelinePackage({
      manifest: minimalManifest,
      files: { 'pipeline.ts': 'export default class {}', '/etc/passwd': 'bad' },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toContainEqual(expect.stringContaining('Absolute paths'))
    }
  })

  it('rejects paths with null bytes', () => {
    const result = validatePipelinePackage({
      manifest: minimalManifest,
      files: { 'pipeline.ts': 'export default class {}', 'evil\0.ts': 'bad' },
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.errors).toContainEqual(expect.stringContaining('Null bytes'))
    }
  })

  it('returns errors array on invalid manifest', () => {
    const result = validatePipelinePackage({ manifest: {}, files: { 'pipeline.ts': '' } })
    expect(result.valid).toBe(false)
  })
})
