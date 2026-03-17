import { useCallback, useRef, useState } from 'react'
import { useBrainStore } from '@/store/useBrainStore'

interface AIResult {
  rewritten?:   string
  tags?:        string
  category?:    string
  actionItems?: string
  title?:       string
}

export interface AIRunOptions {
  systemInstruction?: string
  temperature?:       number
  maxTokens?:         number
  model?:             string
}

/* ── Shared prompt builder ────────────────────────────────────────── */
function buildPrompt(action: string, text: string): string {
  const p: Record<string, string> = {
    rewrite:    `You are a thoughtful journal editor. Rewrite the following note in a clear, polished, first-person journal style. Preserve all meaning. Output only the rewritten text, no intro.\n\n${text}`,
    tags:       `Extract 3-7 concise tags from this note. Output only a comma-separated list of lowercase tags, no explanation.\n\n${text}`,
    categorize: `Suggest one category and one sub-category for this journal note. Output as: "Category: X, SubCategory: Y". No explanation.\n\n${text}`,
    actions:    `Extract action items from this note. Output as a numbered list, one per line. If none, say "No action items."\n\n${text}`,
    title:      `Generate a concise, descriptive title for this journal note (5-10 words maximum). Capture the key topic or event. Output only the title text, no quotes, no explanation.\n\n${text}`,
    all:        `Analyze this journal note and return a JSON object with keys: title (concise 5-10 word title), rewritten (polished version), tags (comma-separated), category, subCategory, actionItems (numbered list). Output only valid JSON.\n\n${text}`,
  }
  return p[action] ?? text
}

/* ── Parse the response content ──────────────────────────────────── */
function parseContent(action: string, content: string): AIResult {
  if (action === 'all') {
    try {
      const m = content.match(/\{[\s\S]*\}/)
      const p = m ? JSON.parse(m[0]) : {}
      return { title: p.title, rewritten: p.rewritten, tags: p.tags, category: p.category, actionItems: p.actionItems }
    } catch { return { rewritten: content } }
  }
  if (action === 'rewrite')    return { rewritten: content.trim() }
  if (action === 'title')      return { title: content.trim() }
  if (action === 'tags')       return { tags: content.trim() }
  if (action === 'categorize') {
    const cat = content.match(/Category:\s*([^,\n]+)/i)
    const sub = content.match(/SubCategory:\s*([^\n]+)/i)
    return { category: cat?.[1]?.trim(), actionItems: sub?.[1]?.trim() }
  }
  if (action === 'actions') return { actionItems: content.trim() }
  return {}
}

/* ── Call OpenAI ─────────────────────────────────────────────────── */
async function callOpenAI(
  key: string,
  messages: { role: 'system' | 'user'; content: string }[],
  model: string,
  temperature: number,
  maxTokens: number,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } })?.error?.message ?? `OpenAI error ${res.status}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

/* ── Call Claude (Anthropic) ─────────────────────────────────────── */
async function callClaude(
  key: string,
  systemMsg: string,
  userMsg: string,
  model: string,
  temperature: number,
  maxTokens: number,
  signal: AbortSignal,
): Promise<string> {
  const claudeModel = model.startsWith('gpt') ? 'claude-3-5-haiku-20241022' : model
  const body: Record<string, unknown> = {
    model: claudeModel,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: userMsg }],
  }
  if (systemMsg.trim()) body.system = systemMsg.trim()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = (err as { error?: { message?: string } })?.error?.message
    throw new Error(msg ?? `Anthropic error ${res.status}`)
  }
  const data = await res.json()
  return (data.content?.[0]?.text as string) ?? ''
}

/* ── Chat-style call (used by AIPanel) ───────────────────────────── */
export async function callAI(opts: {
  provider: 'openai' | 'claude'
  key: string
  model?: string
  systemMsg?: string
  userMsg: string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}): Promise<string> {
  const {
    provider, key, systemMsg = '', userMsg,
    model = provider === 'claude' ? 'claude-3-5-haiku-20241022' : 'gpt-4o-mini',
    maxTokens = 1200, temperature = 0.7,
    signal = new AbortController().signal,
  } = opts

  if (provider === 'claude') {
    return callClaude(key, systemMsg, userMsg, model, temperature, maxTokens, signal)
  }
  const messages: { role: 'system' | 'user'; content: string }[] = []
  if (systemMsg.trim()) messages.push({ role: 'system', content: systemMsg.trim() })
  messages.push({ role: 'user', content: userMsg })
  return callOpenAI(key, messages, model, temperature, maxTokens, signal)
}

/* ── useAI hook ──────────────────────────────────────────────────── */
export function useAI() {
  const settings       = useBrainStore((s) => s.settings)
  const aiInstructions = useBrainStore((s) => s.aiInstructions)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
  }, [])

  const run = useCallback(async (
    action: 'rewrite' | 'tags' | 'categorize' | 'actions' | 'all' | 'title',
    text:   string,
    options: AIRunOptions = {},
  ): Promise<AIResult> => {
    const { aiProvider, openAiKey, claudeApiKey } = settings
    const activeKey = aiProvider === 'claude' ? claudeApiKey : openAiKey

    if (!activeKey) {
      const label = aiProvider === 'claude' ? 'Claude (Anthropic)' : 'OpenAI'
      setError(`${label} API key not set. Go to Settings → AI.`)
      return {}
    }
    if (!text.trim()) { setError('No text to process.'); return {} }

    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)

    const { systemInstruction, temperature = 0.7, maxTokens = 800 } = options
    const defaultModel = aiProvider === 'claude' ? 'claude-3-5-haiku-20241022' : 'gpt-4o-mini'
    const model = options.model ?? defaultModel

    const globalInstr = aiInstructions.global?.trim()
    const combined = [globalInstr, systemInstruction?.trim()].filter(Boolean).join('\n\n')
    const promptText = buildPrompt(action, text)

    try {
      let content: string
      if (aiProvider === 'claude') {
        content = await callClaude(activeKey, combined, promptText, model, temperature, maxTokens, controller.signal)
      } else {
        const messages: { role: 'system' | 'user'; content: string }[] = []
        if (combined) messages.push({ role: 'system', content: combined })
        messages.push({ role: 'user', content: promptText })
        content = await callOpenAI(activeKey, messages, model, temperature, maxTokens, controller.signal)
      }
      return parseContent(action, content)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return {}
      setError(err instanceof Error ? err.message : 'AI request failed')
      return {}
    } finally {
      setLoading(false)
    }
  }, [settings, aiInstructions])

  return { run, loading, error, clearError: () => setError(null), abort }
}
