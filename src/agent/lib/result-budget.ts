const DEFAULT_MAX_CHARS = 50_000

/**
 * Truncates large tool results to prevent context overflow.
 *
 * @param result The tool result (string, object, or primitive)
 * @param maxChars Maximum characters allowed (default: 50,000)
 * @returns The budgeted result — truncated to maxChars if needed
 */
export function budgetToolResult<T>(
  result: T,
  maxChars: number = DEFAULT_MAX_CHARS,
): T | string {
  if (result === null || result === undefined) return result

  if (typeof result === 'string') {
    if (result.length <= maxChars) return result
    const truncated = result.slice(0, maxChars)
    return `${truncated}\n\n[Truncated — original ${result.length} chars]`
  }

  if (typeof result === 'object') {
    const serialized = JSON.stringify(result)
    if (serialized.length <= maxChars) return result
    // For oversized objects, return a truncated string so context doesn't overflow
    const truncated = serialized.slice(0, maxChars)
    return `${truncated}\n\n[Truncated — original object was ${serialized.length} chars]`
  }

  return result
}
