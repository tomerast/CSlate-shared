/**
 * Context compaction utility.
 * Summarizes old conversation turns when approaching context limits.
 */

export type ConversationMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const CHARS_PER_TOKEN = 4
const COMPACT_THRESHOLD = 0.8
const MIN_MESSAGES_TO_COMPACT = 4
const PRESERVED_TAIL_COUNT = 4
const DEFAULT_CONTEXT_WINDOW = 200_000

/**
 * Estimates token count based on character count.
 * Uses rough heuristic: ~4 chars per token.
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Determines if conversation should be compacted.
 * Returns true when estimated tokens > 80% of context window AND messages.length >= 4.
 */
export function shouldCompact(
  messages: ConversationMessage[],
  contextWindowTokens: number = DEFAULT_CONTEXT_WINDOW,
): boolean {
  if (messages.length < MIN_MESSAGES_TO_COMPACT) return false

  const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0)
  const totalEstimatedTokens = Math.ceil(totalChars / CHARS_PER_TOKEN)

  return totalEstimatedTokens > contextWindowTokens * COMPACT_THRESHOLD
}

/**
 * Builds a compact summary of older messages.
 * Preserves last N messages, summarizes the rest.
 */
export function buildCompactSummary(
  messages: ConversationMessage[],
  preserveCount: number = PRESERVED_TAIL_COUNT,
): { summary: string; preserved: ConversationMessage[] } {
  const splitIndex = Math.max(0, messages.length - preserveCount)
  const toSummarize = messages.slice(0, splitIndex)
  const preserved = messages.slice(splitIndex)

  const summaryParts: string[] = []
  for (const msg of toSummarize) {
    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant'
    const preview =
      msg.content.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content
    summaryParts.push(`${roleLabel}: ${preview}`)
  }

  const summary =
    summaryParts.length > 0
      ? `[Earlier conversation summary]\n${summaryParts.join('\n')}`
      : '[No earlier messages]'

  return { summary, preserved }
}

/**
 * Auto-compacts messages if over threshold.
 * Returns original messages if under threshold, otherwise returns compacted version.
 */
export function autoCompactIfNeeded(
  messages: ConversationMessage[],
  contextWindowTokens: number = DEFAULT_CONTEXT_WINDOW,
): ConversationMessage[] {
  if (!shouldCompact(messages, contextWindowTokens)) return messages

  const { summary, preserved } = buildCompactSummary(messages)
  return [{ role: 'system', content: summary }, ...preserved]
}
