import { describe, it, expect } from 'vitest'
import {
  CheckpointTriggerSchema,
  CheckpointUploadSchema,
  CheckpointMetaSchema,
  CheckpointListResponseSchema,
} from './checkpoint'

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

const validUpload = {
  projectId: '550e8400-e29b-41d4-a716-446655440000',
  componentLocalId: 'todo-list-abc123',
  componentName: 'Todo List',
  version: 'v3',
  files: { 'ui.tsx': 'export default function TodoList() { return <div /> }' },
  manifest: minimalManifest,
  description: 'Added drag-and-drop reordering of items',
  trigger: 'user-accept' as const,
}

describe('CheckpointTriggerSchema', () => {
  it('accepts all valid trigger values', () => {
    const valid = ['user-accept', 'pre-modification', 'manual', 'auto-interval']
    valid.forEach(t => {
      expect(CheckpointTriggerSchema.safeParse(t).success).toBe(true)
    })
  })

  it('rejects unknown trigger values', () => {
    expect(CheckpointTriggerSchema.safeParse('unknown').success).toBe(false)
  })
})

describe('CheckpointUploadSchema', () => {
  it('accepts a valid checkpoint upload', () => {
    expect(CheckpointUploadSchema.safeParse(validUpload).success).toBe(true)
  })

  it('rejects invalid projectId (not UUID)', () => {
    expect(CheckpointUploadSchema.safeParse({ ...validUpload, projectId: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects description over 500 chars', () => {
    expect(CheckpointUploadSchema.safeParse({ ...validUpload, description: 'a'.repeat(501) }).success).toBe(false)
  })

  it('rejects invalid manifest in upload', () => {
    expect(CheckpointUploadSchema.safeParse({ ...validUpload, manifest: { name: '' } }).success).toBe(false)
  })

  it('accepts empty files record', () => {
    expect(CheckpointUploadSchema.safeParse({ ...validUpload, files: {} }).success).toBe(true)
  })
})

describe('CheckpointMetaSchema', () => {
  const validMeta = {
    version: 'v3',
    componentName: 'Todo List',
    description: 'Added drag-and-drop',
    trigger: 'user-accept',
    createdAt: '2026-03-28T10:00:00.000Z',
  }

  it('accepts valid meta', () => {
    expect(CheckpointMetaSchema.safeParse(validMeta).success).toBe(true)
  })

  it('rejects invalid datetime format', () => {
    expect(CheckpointMetaSchema.safeParse({ ...validMeta, createdAt: '2026-03-28' }).success).toBe(false)
  })
})

describe('CheckpointListResponseSchema', () => {
  it('accepts valid list response', () => {
    const response = {
      componentLocalId: 'todo-list-abc123',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      checkpoints: [
        {
          version: 'v3',
          componentName: 'Todo List',
          description: 'Added drag-and-drop',
          trigger: 'user-accept',
          createdAt: '2026-03-28T10:00:00.000Z',
        },
      ],
    }
    expect(CheckpointListResponseSchema.safeParse(response).success).toBe(true)
  })

  it('accepts empty checkpoints array', () => {
    const response = {
      componentLocalId: 'todo-list-abc123',
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      checkpoints: [],
    }
    expect(CheckpointListResponseSchema.safeParse(response).success).toBe(true)
  })
})
