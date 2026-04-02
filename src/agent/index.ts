// @cslate/shared/agent — Shared agent infrastructure for CSlate client and server
// Usage: import { buildRegistry, buildTool, runSubAgent } from '@cslate/shared/agent'

// Provider registry
export { buildRegistry, mainModelId, fastModelId } from './providers'
export type { LLMConfig, AgentRegistry } from './providers'

// Tool system
export { buildTool, toAISDKTools } from './tools/types'
export type {
  CSTool,
  CSToolDef,
  ToolResult,
  ToolUseContext,
  ValidationResult,
} from './tools/types'

// Agent loop engine
export { runSubAgent, runAgentStream } from './loop'
export type {
  RunSubAgentParams,
  RunAgentStreamParams,
  AgentStreamResult,
  SubAgentResult,
  TokenUsage,
} from './loop'

// Utilities
export { stripFences } from './lib/strip-fences'
export { estimateTokens, shouldCompact, buildCompactSummary, autoCompactIfNeeded } from './lib/compact'
export type { ConversationMessage } from './lib/compact'
export { budgetToolResult } from './lib/result-budget'
export { createChildAbortController } from './lib/abort-utils'
