import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const MODEL = 'claude-sonnet-4-6'

export const extractJSON = (text: string): unknown => {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON found in Claude response')
  return JSON.parse(match[0])
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
