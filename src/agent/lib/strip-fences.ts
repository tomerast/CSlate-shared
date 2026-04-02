/**
 * Strip markdown code fences from LLM output.
 * Handles ```json, ```jsx, ```tsx, ```typescript, ```javascript, ```ts, ```js, and bare ``` fences.
 */
export function stripFences(code: string): string {
  const trimmed = code.trim()
  const match = trimmed.match(
    /^```(?:json|jsx|tsx|typescript|javascript|ts|js)?\s*\n([\s\S]*?)\n```\s*$/,
  )
  return match ? match[1] : trimmed
}
