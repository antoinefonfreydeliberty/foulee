import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const MODEL = 'claude-sonnet-4-6'

export const extractJSON = (text: string): unknown => {
  // Strip markdown code fences if present
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in Claude response')
  // Remove trailing commas before } or ] to tolerate LLM formatting quirks
  const cleaned = match[0].replace(/,(\s*[}\]])/g, '$1')
  console.error('[onboarding] raw claude response:', match[0])
  return JSON.parse(cleaned)
}

export async function callClaudeWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === retries - 1) throw err
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
    }
  }
  throw new Error('Max retries exceeded')
}
