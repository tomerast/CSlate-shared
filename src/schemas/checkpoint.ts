import { z } from 'zod'
import { ComponentManifestSchema } from './manifest'

export const CheckpointTriggerSchema = z.enum([
  'user-accept',       // User clicked Accept in the iteration loop
  'pre-modification',  // Auto-saved before a major AI change
  'manual',            // User explicitly triggered a save
  'auto-interval',     // Periodic auto-save
])

export const CheckpointUploadSchema = z.object({
  projectId: z.string().uuid(),
  componentLocalId: z.string(),      // Local client identifier (not server UUID)
  componentName: z.string().min(1),
  version: z.string(),               // Local version string, e.g. "v3"
  files: z.record(z.string()),       // path → file content
  manifest: ComponentManifestSchema,
  description: z.string().max(500),  // AI-generated summary of this version
  trigger: CheckpointTriggerSchema,
})

export const CheckpointMetaSchema = z.object({
  version: z.string(),
  componentName: z.string().min(1),
  description: z.string(),
  trigger: CheckpointTriggerSchema,
  createdAt: z.string().datetime(),
})

export const CheckpointListResponseSchema = z.object({
  componentLocalId: z.string(),
  projectId: z.string().uuid(),
  checkpoints: z.array(CheckpointMetaSchema),
})
