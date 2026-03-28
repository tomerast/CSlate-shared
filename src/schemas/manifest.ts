// src/schemas/manifest.ts
import { z } from 'zod'

export const FieldTypeSchema = z.enum(['string', 'number', 'boolean', 'array', 'object', 'any'])

export const InputFieldSchema = z.object({
  type: FieldTypeSchema,
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
  stateKey: z.string().optional(),
})

export const OutputFieldSchema = z.object({
  type: FieldTypeSchema,
  description: z.string(),
  stateKey: z.string().optional(),
})

export const EventSchema = z.object({
  description: z.string(),
  payload: z.record(z.object({
    type: z.string(),
    description: z.string(),
  })),
})

export const ActionSchema = z.object({
  description: z.string(),
  params: z.record(z.object({
    type: z.string(),
    description: z.string(),
  })),
})

export const FileEntrySchema = z.object({
  path: z.string(),
  type: z.enum(['ui', 'logic', 'types', 'context', 'style', 'test', 'other']),
  role: z.string(),
})

export const EndpointSchema = z.object({
  path: z.string(),
  method: z.enum(['GET', 'POST']),
  description: z.string(),
  params: z.record(z.object({
    type: z.string(),
    description: z.string(),
    userConfigurable: z.boolean(),
    default: z.unknown().optional(),
  })),
  refreshInterval: z.number().optional(),
})

export const DataSourceSchema = z.object({
  description: z.string(),
  type: z.enum(['rest-api', 'websocket', 'graphql']),
  baseUrl: z.string().url(),
  endpoints: z.record(EndpointSchema),
  rateLimit: z.object({
    maxRequests: z.number(),
    perSeconds: z.number(),
  }).optional(),
})

export const UserConfigFieldSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'string[]', 'object']),
  description: z.string(),
  required: z.boolean(),
  default: z.unknown().optional(),
  sensitive: z.boolean().optional(),
  example: z.unknown().optional(),
})

export const SizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const ComponentManifestSchema = z.object({
  // Identity
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tags: z.array(z.string()).max(10),
  version: z.string().optional(),

  // Data interface
  inputs: z.record(InputFieldSchema),
  outputs: z.record(OutputFieldSchema),
  events: z.record(EventSchema),
  actions: z.record(ActionSchema),

  // Package structure
  files: z.array(FileEntrySchema),

  // Compound anatomy (optional)
  anatomy: z.object({
    parts: z.array(z.string()),
    slots: z.array(z.string()).optional(),
  }).optional(),

  // Dependencies (optional)
  dependencies: z.object({
    cslateComponents: z.array(z.string()).optional(),
    npmPackages: z.array(z.object({
      name: z.string(),
      version: z.string(),
    })).optional(),
  }).optional(),

  // External data sources — max 5, server rejects more with TOO_MANY_DATA_SOURCES
  dataSources: z.record(DataSourceSchema).optional().superRefine((val, ctx) => {
    if (val && Object.keys(val).length > 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: 5,
        type: 'array',
        inclusive: true,
        message: 'TOO_MANY_DATA_SOURCES: maximum 5 dataSources per manifest',
      })
    }
  }),

  // User-configurable parameters (API keys, settings)
  // sensitive: true fields are stripped by client before community upload
  userConfig: z.record(UserConfigFieldSchema).optional(),

  // AI hints — server-generated during Stage 6 (cataloging), present on approved components
  ai: z.object({
    modificationHints: z.array(z.string()).optional(),
    extensionPoints: z.array(z.string()).optional(),
    similarTo: z.array(z.string().uuid()).optional(),
  }).optional(),

  // Layout
  defaultSize: SizeSchema,
  minSize: SizeSchema.optional(),
})

export const ComponentPackageSchema = z.object({
  manifest: ComponentManifestSchema,
  files: z.record(z.string()),
})
