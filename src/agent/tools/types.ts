import type { Tool, ToolExecutionOptions } from 'ai'
import { z } from 'zod'

/**
 * Result returned by a CSlate tool execution.
 */
export type ToolResult<T> = { data: T }

/**
 * Validation result for tool input.
 */
export type ValidationResult =
  | { valid: true }
  | { valid: false; message: string }

/**
 * Context passed to tool execution.
 */
export type ToolUseContext = {
  projectDir: string
  abortSignal?: AbortSignal
}

/**
 * CSlate tool interface with metadata and execution.
 */
export interface CSTool<INPUT = any, OUTPUT = any> {
  readonly name: string
  readonly description: string
  readonly inputSchema: z.ZodObject<any>
  call(args: INPUT, context?: ToolUseContext): Promise<ToolResult<OUTPUT>>
  isReadOnly(input: INPUT): boolean
  isConcurrencySafe(input: INPUT): boolean
  validateInput?(input: INPUT): Promise<ValidationResult>
  readonly maxResultSizeChars: number
  toAISDKTool(): Tool<INPUT, OUTPUT>
}

/**
 * Partial definition used to build a CSTool.
 */
export type CSToolDef<INPUT = any, OUTPUT = any> = {
  name: string
  description: string
  inputSchema: z.ZodObject<any>
  call(args: INPUT, context?: ToolUseContext): Promise<ToolResult<OUTPUT>>
  isReadOnly?(input: INPUT): boolean
  isConcurrencySafe?(input: INPUT): boolean
  validateInput?(input: INPUT): Promise<ValidationResult>
  maxResultSizeChars?: number
}

/**
 * Builds a CSTool from a partial definition, filling in safe defaults.
 */
export function buildTool<INPUT = any, OUTPUT = any>(
  def: CSToolDef<INPUT, OUTPUT>,
): CSTool<INPUT, OUTPUT> {
  const isReadOnly = def.isReadOnly ?? (() => false)
  const isConcurrencySafe = def.isConcurrencySafe ?? (() => false)
  const maxResultSizeChars = def.maxResultSizeChars ?? 50_000
  const validateInput = def.validateInput

  return {
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    call: def.call,
    isReadOnly,
    isConcurrencySafe,
    validateInput,
    maxResultSizeChars,
    toAISDKTool(): Tool<INPUT, OUTPUT> {
      return {
        description: def.description,
        inputSchema: def.inputSchema as any,
        execute: async (input: INPUT, options: ToolExecutionOptions) => {
          if (validateInput) {
            const validationResult = await validateInput(input)
            if (validationResult.valid === false) {
              throw new Error(validationResult.message)
            }
          }

          const context: ToolUseContext = {
            projectDir: '',
            abortSignal: options.abortSignal,
          }
          const result = await def.call(input, context)
          return result.data
        },
      } as unknown as Tool<INPUT, OUTPUT>
    },
  }
}

/**
 * Converts an array of CSTools into an AI SDK tools record.
 */
export function toAISDKTools(tools: CSTool[]): Record<string, Tool> {
  const record: Record<string, Tool> = {}
  for (const tool of tools) {
    record[tool.name] = tool.toAISDKTool()
  }
  return record
}
