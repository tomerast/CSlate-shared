// src/schemas/pipeline-manifest.ts
import { z } from 'zod'

export const PipelineSecretSchema = z.object({
  description: z.string(),
  required: z.boolean(),
})

export const PipelineParamSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'object']),
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
})

export const PipelineOutputFieldSchema = z.object({
  type: z.string(),
  description: z.string(),
})

export const PipelineStrategySchema = z.object({
  type: z.enum(['on-demand', 'polling', 'streaming']),
  intervalMs: z.number().optional(),
  cacheTtlMs: z.number().optional(),
})

export const PipelineManifestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tags: z.array(z.string()).max(10),
  secrets: z.record(PipelineSecretSchema),
  params: z.record(PipelineParamSchema),
  outputSchema: z.record(PipelineOutputFieldSchema),
  strategy: PipelineStrategySchema,
  files: z.array(z.string()),
  version: z.string().optional(),
})

export const PipelineOutputSchema = z.object({
  data: z.unknown(),
  metadata: z.object({
    fetchedAt: z.number(),
    source: z.string(),
    cached: z.boolean(),
  }),
})

export const PipelinePackageSchema = z.object({
  manifest: PipelineManifestSchema,
  files: z.record(z.string()).superRefine((files, ctx) => {
    if (!('pipeline.ts' in files)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'pipeline.ts is required — it is the pipeline entry point',
        path: ['pipeline.ts'],
      })
    }
    for (const filePath of Object.keys(files)) {
      if (filePath.includes('..')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Path traversal not allowed: "${filePath}"`,
          path: [filePath],
        })
      }
      if (filePath.startsWith('/')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Absolute paths not allowed: "${filePath}"`,
          path: [filePath],
        })
      }
      if (filePath.includes('\0')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Null bytes not allowed in path: "${filePath}"`,
          path: [filePath],
        })
      }
    }
  }),
})

export type PipelineValidationResult =
  | { valid: true; pkg: z.infer<typeof PipelinePackageSchema> }
  | { valid: false; errors: string[] }

export function validatePipelinePackage(pkg: unknown): PipelineValidationResult {
  const result = PipelinePackageSchema.safeParse(pkg)
  if (result.success) return { valid: true, pkg: result.data }
  const errors = result.error.issues.map(issue => {
    const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
    return `${path}${issue.message}`
  })
  return { valid: false, errors }
}
