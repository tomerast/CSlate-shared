// All types are inferred from Zod schemas — never hand-written
// This guarantees runtime validation and TypeScript types are always in sync
import type { z } from 'zod'

import type {
  ComponentManifestSchema,
  ComponentPackageSchema,
  FieldTypeSchema,
  InputFieldSchema,
  OutputFieldSchema,
  ComponentEventSchema,
  ComponentActionSchema,
  FileEntrySchema,
  DataSourceSchema,
  ComponentEndpointSchema,
  UserConfigFieldSchema,
  ComponentSizeSchema,
} from '../schemas/manifest'

import type {
  CheckpointUploadSchema,
  CheckpointMetaSchema,
  CheckpointListResponseSchema,
  CheckpointTriggerSchema,
} from '../schemas/checkpoint'

import type {
  RegisterResponseSchema,
  SearchRequestSchema,
  SearchResponseSchema,
  SearchResultItemSchema,
  UploadResponseSchema,
  ReviewStageSchema,
  ReviewEventSchema,
  CheckUpdatesRequestSchema,
  CheckUpdatesResponseSchema,
  RateComponentRequestSchema,
  ReportAbuseRequestSchema,
  ApiErrorSchema,
  ErrorCodeSchema,
} from '../schemas/api'

// Manifest types
export type ComponentManifest = z.infer<typeof ComponentManifestSchema>
export type ComponentPackage = z.infer<typeof ComponentPackageSchema>
export type FieldType = z.infer<typeof FieldTypeSchema>
export type InputField = z.infer<typeof InputFieldSchema>
export type OutputField = z.infer<typeof OutputFieldSchema>
export type ComponentEvent = z.infer<typeof ComponentEventSchema>
export type ComponentAction = z.infer<typeof ComponentActionSchema>
export type FileEntry = z.infer<typeof FileEntrySchema>
export type DataSource = z.infer<typeof DataSourceSchema>
export type Endpoint = z.infer<typeof ComponentEndpointSchema>
export type UserConfigField = z.infer<typeof UserConfigFieldSchema>
export type ComponentSize = z.infer<typeof ComponentSizeSchema>

// Checkpoint types
export type CheckpointUpload = z.infer<typeof CheckpointUploadSchema>
export type CheckpointMeta = z.infer<typeof CheckpointMetaSchema>
export type CheckpointListResponse = z.infer<typeof CheckpointListResponseSchema>
export type CheckpointTrigger = z.infer<typeof CheckpointTriggerSchema>

// API types
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>
export type SearchRequest = z.infer<typeof SearchRequestSchema>
export type SearchResponse = z.infer<typeof SearchResponseSchema>
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>
export type UploadResponse = z.infer<typeof UploadResponseSchema>
export type ReviewStage = z.infer<typeof ReviewStageSchema>
export type ReviewEvent = z.infer<typeof ReviewEventSchema>
export type CheckUpdatesRequest = z.infer<typeof CheckUpdatesRequestSchema>
export type CheckUpdatesResponse = z.infer<typeof CheckUpdatesResponseSchema>
export type RateComponentRequest = z.infer<typeof RateComponentRequestSchema>
export type ReportAbuseRequest = z.infer<typeof ReportAbuseRequestSchema>
export type ApiError = z.infer<typeof ApiErrorSchema>
export type ErrorCode = z.infer<typeof ErrorCodeSchema>
