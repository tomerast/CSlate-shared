import { generateText, streamText, stepCountIs, type ModelMessage } from 'ai'
import type { AgentRegistry } from './providers'

/**
 * Token usage from a single agent call.
 */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

/**
 * Result from a sub-agent run (generateText).
 */
export interface SubAgentResult {
  text: string
  usage: TokenUsage
  steps: number
}

/**
 * Parameters for running a sub-agent (one-shot generateText).
 */
export interface RunSubAgentParams {
  modelId: string
  registry: AgentRegistry
  system: string
  prompt: string
  tools?: Record<string, any>
  maxSteps?: number
  maxOutputTokens?: number
  abortSignal?: AbortSignal
}

/**
 * Runs a sub-agent using generateText. Used for expert agents, red-team, judge,
 * and any single-turn agent that runs tools iteratively then returns text.
 */
export async function runSubAgent(params: RunSubAgentParams): Promise<SubAgentResult> {
  const {
    modelId,
    registry,
    system,
    prompt,
    tools,
    maxSteps = 8,
    maxOutputTokens = 12_000,
    abortSignal,
  } = params

  const hasTools = tools && Object.keys(tools).length > 0

  const result = await generateText({
    model: registry.languageModel(modelId),
    system,
    prompt,
    ...(hasTools ? { tools, stopWhen: stepCountIs(maxSteps) } : {}),
    maxOutputTokens,
    abortSignal,
  })

  const usage: TokenUsage = {
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
    totalTokens: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
  }

  return {
    text: result.text,
    usage,
    steps: result.steps?.length ?? 1,
  }
}

/**
 * Parameters for running an agent loop (streaming multi-turn with streamText).
 */
export interface RunAgentStreamParams {
  modelId: string
  registry: AgentRegistry
  system: string
  messages: ModelMessage[]
  tools: Record<string, any>
  maxSteps?: number
  maxOutputTokens?: number
  temperature?: number
  prepareStep?: (context: { steps: any[] }) => { toolChoice?: any; activeTools?: string[] } | PromiseLike<{ toolChoice?: any; activeTools?: string[] }>
  onStepFinish?: (step: { toolCalls: any[]; response: any; usage: TokenUsage }) => void | Promise<void>
  abortSignal?: AbortSignal
}

/**
 * Result from streamText — provides fullStream async iterable and promise accessors.
 */
export interface AgentStreamResult {
  readonly fullStream: AsyncIterable<any>
  readonly text: PromiseLike<string>
  readonly usage: PromiseLike<any>
  readonly steps: PromiseLike<any[]>
}

/**
 * Runs an agent loop using streamText. Used for orchestrator-style agents
 * that need multi-turn tool use with phase-based routing.
 *
 * Returns the streamText result directly for the caller to consume via fullStream.
 */
export function runAgentStream(params: RunAgentStreamParams): AgentStreamResult {
  const {
    modelId,
    registry,
    system,
    messages,
    tools,
    maxSteps = 15,
    maxOutputTokens = 16_000,
    temperature = 0.2,
    prepareStep,
    onStepFinish,
    abortSignal,
  } = params

  return streamText({
    model: registry.languageModel(modelId),
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps),
    maxOutputTokens,
    temperature,
    abortSignal,
    ...(prepareStep ? { prepareStep } : {}),
    ...(onStepFinish
      ? {
          onStepFinish: async ({ toolCalls, response, usage: stepUsage }: any) => {
            await onStepFinish({
              toolCalls: toolCalls ?? [],
              response,
              usage: {
                inputTokens: stepUsage?.inputTokens ?? 0,
                outputTokens: stepUsage?.outputTokens ?? 0,
                totalTokens: (stepUsage?.inputTokens ?? 0) + (stepUsage?.outputTokens ?? 0),
              },
            })
          },
        }
      : {}),
  }) as any
}
