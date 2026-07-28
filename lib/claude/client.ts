import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const MODEL = 'claude-sonnet-4-6'

export const extractJSON = (text: string): unknown => {
  let content = text.trim()

  // Étape 1 : extraire le contenu depuis les code fences,
  // qu'elles soient au début ou précédées de texte
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) {
    content = fenceMatch[1].trim()
  }

  // Étape 2 : trouver le premier objet JSON complet
  // (ne pas être greedy jusqu'au DERNIER })
  // On cherche { ou [, puis on compte les profondeurs
  const startObj = content.indexOf('{')
  const startArr = content.indexOf('[')
  const start =
    startObj === -1 ? startArr
    : startArr === -1 ? startObj
    : Math.min(startObj, startArr)

  if (start === -1) {
    throw new Error('No JSON found in Claude response')
  }

  const openChar = content[start]
  const closeChar = openChar === '{' ? '}' : ']'
  let depth = 0
  let inString = false
  let escape = false
  let end = -1

  for (let i = start; i < content.length; i++) {
    const c = content[i]
    if (escape)        { escape = false; continue }
    if (c === '\\' && inString) { escape = true; continue }
    if (c === '"')     { inString = !inString; continue }
    if (inString)      continue
    if (c === openChar) depth++
    if (c === closeChar) {
      depth--
      if (depth === 0) { end = i; break }
    }
  }

  if (end === -1) {
    throw new Error('Truncated JSON in Claude response (unbalanced brackets)')
  }

  let extracted = content.slice(start, end + 1)

  // Étape 3 : nettoyer les artefacts LLM courants
  extracted = extracted.replace(/\/\/[^\n\r]*/g, '')        // commentaires //
  extracted = extracted.replace(/\/\*[\s\S]*?\*\//g, '')    // commentaires /* */
  extracted = extracted.replace(/,(\s*[}\]])/g, '$1')        // trailing commas

  try {
    return JSON.parse(extracted)
  } catch (err) {
    console.error('[extractJSON] JSON.parse failed. First 500 chars:', extracted.slice(0, 500))
    throw err
  }
}

// Détecte l'erreur intermittente de JSON tronqué / brackets déséquilibrés
// levée par extractJSON quand la réponse Claude est coupée (cf. Foulée.md,
// observée sur le cron : Alix le 14/06, Hugo semaine 7). Retenter à l'identique
// suffit le plus souvent à obtenir une réponse complète.
export const isTruncatedJsonError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err)
  return /Truncated JSON in Claude response|unbalanced brackets/i.test(msg)
}

export async function callClaudeWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3
): Promise<T> {
  // Budget de retries DÉDIÉ au JSON tronqué, en plus du budget générique.
  // On lui accorde jusqu'à 2 nouveaux essais avec un court délai fixe AVANT de
  // retomber dans la politique de retry générique (backoff exponentiel), afin de
  // maximiser les chances d'obtenir un JSON complet sur ce bug intermittent.
  const maxTruncatedRetries = 2
  let truncatedRetries = 0
  let genericAttempts = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn()
    } catch (err) {
      if (isTruncatedJsonError(err) && truncatedRetries < maxTruncatedRetries) {
        truncatedRetries++
        await new Promise(r => setTimeout(r, 800))
        continue
      }
      // Politique générique inchangée pour les autres types d'erreurs :
      // `retries` tentatives au total, backoff exponentiel 1s puis 2s.
      genericAttempts++
      if (genericAttempts >= retries) throw err
      await new Promise(r => setTimeout(r, Math.pow(2, genericAttempts - 1) * 1000))
    }
  }
}
