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
