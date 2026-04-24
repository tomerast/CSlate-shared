import { z } from 'zod'
import { ComponentManifestSchema } from './manifest'

// Auth
export const RegisterResponseSchema = z.object({
  apiKey: z.string(),
  userId: z.string().uuid(),
})

// Search
export const SearchRequestSchema = z.object({
  q: z.string().min(1),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  limit: z.number().int().min(1).max(50).default(10),
  offset: z.number().int().min(0).default(0),
  minRating: z.number().min(1).max(5).optional(),
  sortBy: z.enum(['relevance', 'rating', 'downloads', 'recent']).default('relevance'),
})

export const SearchResultItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  summary: z.string(),         // AI-generated 1-2 sentence "why this was built"
  description: z.string(),
  tags: z.array(z.string()),
  category: z.string(),
  complexity: z.string(),
  rating: z.number(),
  downloadCount: z.number(),
  relevanceScore: z.number(),
  manifest: ComponentManifestSchema,
})

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultItemSchema),
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
})

// Upload
// Server returns 202 Accepted with `status: 'pending'` — review happens async
// on the worker. Clients subscribe to the SSE stream at
// `/api/v1/components/upload/:id/stream` to receive terminal status.
export const UploadResponseSchema = z.object({
  uploadId: z.string().uuid(),
  status: z.literal('pending'),
})

// Source fetch — `GET /api/v1/components/:id/source`
// Files are keyed by path, values are raw text (e.g. `{ 'ui.tsx': '...', 'bundle.js': '...' }`).
export const ComponentSourceResponseSchema = z.object({
  id: z.string().uuid(),
  manifest: ComponentManifestSchema,
  files: z.record(z.string(), z.string()),
  summary: z.string().optional(),
  version: z.string(),
  updatedAt: z.union([z.string(), z.date()]),
})

// Source fetch — `GET /api/v1/pipelines/:id/source`
// Same shape as component source but the manifest is a PipelineManifest.
// We don't import PipelineManifestSchema here to keep this file dependency-light;
// consumers that need stricter validation can narrow afterwards.
export const PipelineSourceResponseSchema = z.object({
  id: z.string().uuid(),
  manifest: z.unknown(),
  files: z.record(z.string(), z.string()),
  summary: z.string().optional(),
  version: z.string(),
  updatedAt: z.union([z.string(), z.date()]),
})

// Review pipeline SSE stream.
// Includes current component stages, current pipeline stages, and legacy stage
// names retained for clients that may still read older upload records.
export const ReviewStageSchema = z.enum([
  // Current component upload stages
  'manifest_validation',
  'dependency_check',
  'agent_review',
  'cataloging',
  'embedding',
  // Current pipeline upload stages
  'manifest-validation',
  'dependency-check',
  'agent-review',
  'embedding-store',
  // Legacy component stages
  'security_scan',
  'quality_review',
  'test_render',
])

export const ReviewEventSchema = z.object({
  stage: ReviewStageSchema.or(z.literal('complete')).optional(),
  status: z.enum(['in_progress', 'complete', 'failed', 'approved', 'rejected']),
  progress: z.number().min(0).max(1).optional(),
  result: z.unknown().optional(),
  componentId: z.string().uuid().optional(),  // Present when stage=complete + status=approved
  pipelineId: z.string().uuid().optional(),
  rejectionReasons: z.unknown().optional(),
  error: z.string().optional(),
  reason: z.string().optional(),              // Present on rejection (e.g. STYLING_TOKEN_VIOLATION)
})

// Check updates — client polls on app launch + every 30 min
export const CheckUpdatesRequestSchema = z.object({
  componentIds: z.array(z.string().uuid()),
})

export const CheckUpdatesResponseSchema = z.object({
  updates: z.array(z.object({
    id: z.string().uuid(),
    currentVersion: z.string(),
    latestVersion: z.string(),
    changelog: z.string().optional(),
  })),
  revocations: z.array(z.object({
    id: z.string().uuid(),
    reason: z.enum(['security', 'abuse', 'legal', 'author-request']),
    message: z.string().optional(),  // Shown to user: "Component X has been removed because..."
  })),
})

// Rating
export const RateComponentRequestSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

// Abuse report
export const ReportAbuseRequestSchema = z.object({
  reason: z.enum(['malicious-code', 'spam', 'copyright', 'inappropriate', 'other']),
  description: z.string().max(1000).optional(),
})

// Error envelope — all API errors use this shape
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
  statusCode: z.number(),
})

// Known error codes — consumers can switch on these
export const ErrorCodeSchema = z.enum([
  'AUTH_REQUIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'MANIFEST_INVALID',
  'UPLOAD_TOO_LARGE',
  'REVIEW_REJECTED',
  'RATE_LIMITED',
  'SERVER_ERROR',
  'TOO_MANY_DATA_SOURCES',
  'STYLING_TOKEN_VIOLATION',  // Raw Tailwind color utility used instead of semantic design token
])
