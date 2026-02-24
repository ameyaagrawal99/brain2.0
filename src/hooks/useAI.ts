import { useCallback, useState } from 'react'
import { useBrainStore } from '@/store/useBrainStore'

interface AIResult {
  rewritten?:   string
  tags?:        string
  category?:    string
  actionItems?: string
}

export interface AIRunOptions {
  systemInstruction?: string   // Prepended as system message
  temperature?:       number   // Default: 0.7
  maxTokens?:         number   // Default: 800
  model?:             string   // Default: gpt-4o-mini
}

export function useAI() {
  const settings = useBrainStore((s) => s.settings)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const run = useCallback(async (
    action: 'rewrite' | 'tags' | 'categorize' | 'actions' | 'all',
    text:   string,
    options: AIRunOptions = {},
  ): Promise<AIResult> => {
    if (!settings.openAiKey) {
      setError('OpenAI key not set. Go to Settings → OpenAI Key.')
      return {}
    }
    if (!text.trim()) {
      setError('No text to process.')
      return {}
    }

    setLoading(true)
    setError(null)

    const {
      systemInstruction,
      temperature = 0.7,
      maxTokens   = 800,
      model       = 'gpt-4o-mini',
    } = options

    const prompts: Record<typeof action, string> = {
      rewrite:    `You are a thoughtful journal editor. Rewrite the following note in a clear, polished, first-person journal style. Preserve all meaning. Output only the rewritten text, no intro.\n\n${text}`,
      tags:       `Extract 3-7 concise tags from this note. Output only a comma-separated list of lowercase tags, no explanation.\n\n${text}`,
      categorize: `Suggest one category and one sub-category for this journal note. Output as: "Category: X, SubCategory: Y". No explanation.\n\n${text}`,
      actions:    `Extract action items from this note. Output as a numbered list, one per line. If none, say "No action items."\n\n${text}`,
      all:        `Analyze this journal note and return a JSON object with keys: rewritten (polished version), tags (comma-separated), category, subCategory, actionItems (numbered list). Output only valid JSON.\n\n${text}`,
    }

    // Build messages array — system instruction prepended if provided
    const messages: { role: 'system' | 'user'; content: string }[] = []
    if (systemInstruction?.trim()) {
      messages.push({ role: 'system', content: systemInstruction.trim() })
    }
    messages.push({ role: 'user', content: prompts[action] })

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openAiKey}`,
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: { message?: string } })?.error?.message ?? `OpenAI error ${res.status}`)
      }

      const data = await res.json()
      const content: string = data.choices?.[0]?.message?.content ?? ''

      if (action === 'all') {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
          return {
            rewritten:   parsed.rewritten,
            tags:        parsed.tags,
            category:    parsed.category,
            actionItems: parsed.actionItems,
          }
        } catch {
          return { rewritten: content }
        }
      }

      if (action === 'rewrite')    return { rewritten: content.trim() }
      if (action === 'tags')       return { tags: content.trim() }
      if (action === 'categorize') {
        const catMatch = content.match(/Category:\s*([^,\n]+)/i)
        const subMatch = content.match(/SubCategory:\s*([^\n]+)/i)
        return {
          category:    catMatch?.[1]?.trim(),
          actionItems: subMatch?.[1]?.trim(),
        }
      }
      if (action === 'actions') return { actionItems: content.trim() }
      return {}
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI request failed'
      setError(msg)
      return {}
    } finally {
      setLoading(false)
    }
  }, [settings.openAiKey])

  return { run, loading, error, clearError: () => setError(null) }
}
