import { useCallback, useState } from 'react'
import { useBrainStore } from '@/store/useBrainStore'

interface AIResult {
  rewritten?:   string
  tags?:        string
  category?:    string
  actionItems?: string
}

export function useAI() {
  const settings = useBrainStore((s) => s.settings)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const run = useCallback(async (
    action: 'rewrite' | 'tags' | 'categorize' | 'actions' | 'all',
    text:   string,
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

    const prompts: Record<typeof action, string> = {
      rewrite:    `You are a thoughtful journal editor. Rewrite the following note in a clear, polished, first-person journal style. Preserve all meaning. Output only the rewritten text, no intro.

${text}`,
      tags:       `Extract 3-7 concise tags from this note. Output only a comma-separated list of lowercase tags, no explanation.

${text}`,
      categorize: `Suggest one category and one sub-category for this journal note. Output as: "Category: X, SubCategory: Y". No explanation.

${text}`,
      actions:    `Extract action items from this note. Output as a numbered list, one per line. If none, say "No action items."

${text}`,
      all:        `Analyze this journal note and return a JSON object with keys: rewritten (polished version), tags (comma-separated), category, subCategory, actionItems (numbered list). Output only valid JSON.

${text}`,
    }

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompts[action] }],
          temperature: 0.7,
          max_tokens: 800,
        }),
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
