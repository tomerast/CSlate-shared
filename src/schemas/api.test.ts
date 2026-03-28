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
