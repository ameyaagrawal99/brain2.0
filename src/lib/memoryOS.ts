import type { BrainRow } from '../types/sheet.ts'
import { parseTags } from './utils.ts'

export type MemoryType =
  | 'Experience'
  | 'Reflection'
  | 'Article Idea'
  | 'Book Fragment'
  | 'Decision'
  | 'Lesson'
  | 'Quote'
  | 'Question'
  | 'Project'
  | 'Research Note'

export interface MemorySignal {
  row: BrainRow
  type: MemoryType
  themes: string[]
  writingAngle: string
  coreInsight: string
  sourceStrength: number
  qualityGaps: string[]
  evidence: string
}

interface ThemeRule {
  theme: string
  words: string[]
}

const THEME_RULES: ThemeRule[] = [
  { theme: 'ambition', words: ['ambition', 'career', 'build', 'public', 'growth', 'scale', 'status'] },
  { theme: 'leadership', words: ['leadership', 'team', 'decision', 'responsibility', 'institution', 'meeting', 'conflict'] },
  { theme: 'writing', words: ['write', 'writing', 'article', 'book', 'essay', 'publish', 'draft', 'story', 'audience'] },
  { theme: 'discipline', words: ['discipline', 'habit', 'routine', 'focus', 'deep work', 'consistency', 'protocol'] },
  { theme: 'identity', words: ['identity', 'self', 'become', 'meaning', 'values', 'belief', 'person'] },
  { theme: 'relationships', words: ['friend', 'family', 'relationship', 'conversation', 'love', 'trust', 'people'] },
  { theme: 'health', words: ['health', 'run', 'gym', 'sleep', 'body', 'exercise', 'energy'] },
  { theme: 'creativity', words: ['creative', 'design', 'idea', 'inspiration', 'product', 'prototype', 'craft'] },
  { theme: 'learning', words: ['learn', 'notes', 'book', 'research', 'study', 'framework', 'principle'] },
  { theme: 'money', words: ['money', 'finance', 'revenue', 'cost', 'price', 'business', 'market'] },
]

function textOf(row: BrainRow) {
  return [row.title, row.category, row.subCategory, row.tags, row.original, row.rewritten, row.actionItems]
    .filter(Boolean)
    .join('\n')
}

function lowerText(row: BrainRow) {
  return textOf(row).toLowerCase()
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word))
}

function firstSentence(text: string, fallback: string) {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return fallback
  const match = cleaned.match(/^(.{30,220}?[.!?])\s/)
  return (match?.[1] ?? cleaned.slice(0, 220)).trim()
}

export function classifyMemoryType(row: BrainRow): MemoryType {
  const text = lowerText(row)
  const cat = `${row.category} ${row.subCategory}`.toLowerCase()
  const tags = parseTags(row.tags).join(' ')

  if (hasAny(text, ['i decided', 'decision', 'chose to', 'tradeoff', 'trade-off', 'option'])) return 'Decision'
  if (hasAny(`${text} ${tags} ${cat}`, ['article', 'essay', 'publish', 'newsletter', 'thread'])) return 'Article Idea'
  if (hasAny(`${text} ${tags} ${cat}`, ['book', 'chapter', 'manuscript', 'memoir'])) return 'Book Fragment'
  if (hasAny(text, ['lesson', 'learned', 'principle', 'rule:', 'takeaway'])) return 'Lesson'
  if (hasAny(text, ['?', 'question', 'why does', 'how do i', 'what if'])) return 'Question'
  if (hasAny(`${text} ${cat}`, ['quote', 'said:', '"', '“'])) return 'Quote'
  if (hasAny(`${text} ${cat}`, ['research', 'notes', 'framework', 'study', 'paper'])) return 'Research Note'
  if (hasAny(`${text} ${cat}`, ['project', 'build', 'prototype', 'launch', 'ship'])) return 'Project'
  if (hasAny(text, ['i feel', 'i think', 'i realized', 'i noticed', 'reflection'])) return 'Reflection'
  return 'Experience'
}

export function extractThemes(row: BrainRow): string[] {
  const text = lowerText(row)
  const explicit = parseTags(row.tags)
    .filter((tag) => tag.length > 2)
    .slice(0, 3)
  const derived = THEME_RULES
    .filter((rule) => hasAny(text, rule.words))
    .map((rule) => rule.theme)
  return [...new Set([...derived, ...explicit])].slice(0, 5)
}

export function getCoreInsight(row: BrainRow) {
  const text = row.rewritten || row.original || row.actionItems || row.title
  const explicit = text.match(/(?:lesson|takeaway|realized|noticed|principle)\s*:?\s*([^.\n]{24,180})/i)
  if (explicit?.[1]) return explicit[1].trim()
  return firstSentence(text, row.title || 'Untitled memory')
}

export function getWritingAngle(row: BrainRow, type = classifyMemoryType(row)) {
  const themes = extractThemes(row)
  const primary = themes[0] ?? row.category?.toLowerCase() ?? 'life'
  if (type === 'Article Idea') return `Turn this into an essay about ${primary}.`
  if (type === 'Book Fragment') return `Use as a source scene or argument in a chapter on ${primary}.`
  if (type === 'Decision') return `Use as a decision case study: context, tradeoff, consequence.`
  if (type === 'Lesson') return `Use as a compact principle supported by lived experience.`
  if (type === 'Question') return `Use as an unresolved question to anchor a reflective piece.`
  if (type === 'Reflection') return `Use as reflective raw material for a piece on ${primary}.`
  return `Use as lived evidence or an example for ${primary}.`
}

export function scoreMemory(row: BrainRow, type: MemoryType, themes: string[]) {
  let score = 0
  const body = row.rewritten || row.original
  if (row.title?.trim()) score += 15
  if (body?.trim()) score += Math.min(30, Math.floor(body.trim().length / 35))
  if (themes.length) score += 15
  if (parseTags(row.tags).length) score += 10
  if (row.people?.trim()) score += 8
  if (row.links?.trim()) score += 8
  if (row.actionItems?.trim()) score += 5
  if (['Article Idea', 'Book Fragment', 'Decision', 'Lesson', 'Reflection'].includes(type)) score += 9
  return Math.max(0, Math.min(100, score))
}

export function getQualityGaps(row: BrainRow, themes: string[]) {
  const gaps: string[] = []
  if (!row.title?.trim()) gaps.push('missing title')
  if (!themes.length) gaps.push('missing durable theme')
  if (!parseTags(row.tags).length) gaps.push('missing tags')
  if (!row.rewritten?.trim() && !row.original?.trim()) gaps.push('missing body')
  if (!row.people?.trim()) gaps.push('no people/context')
  if (!row.links?.trim()) gaps.push('not linked')
  return gaps.slice(0, 4)
}

export function buildMemorySignals(rows: BrainRow[]): MemorySignal[] {
  return rows
    .filter((row) => row.title?.trim() || row.original?.trim() || row.rewritten?.trim())
    .map((row) => {
      const type = classifyMemoryType(row)
      const themes = extractThemes(row)
      return {
        row,
        type,
        themes,
        writingAngle: getWritingAngle(row, type),
        coreInsight: getCoreInsight(row),
        sourceStrength: scoreMemory(row, type, themes),
        qualityGaps: getQualityGaps(row, themes),
        evidence: firstSentence(row.rewritten || row.original || row.title, row.title || 'Untitled memory'),
      }
    })
    .sort((a, b) => b.sourceStrength - a.sourceStrength)
}

export function summarizeThemes(signals: MemorySignal[]) {
  const counts = new Map<string, { theme: string; count: number; sources: MemorySignal[] }>()
  signals.forEach((signal) => {
    signal.themes.forEach((theme) => {
      const entry = counts.get(theme) ?? { theme, count: 0, sources: [] }
      entry.count += 1
      if (entry.sources.length < 5) entry.sources.push(signal)
      counts.set(theme, entry)
    })
  })
  return [...counts.values()].sort((a, b) => b.count - a.count || a.theme.localeCompare(b.theme))
}

export function buildSourcePacket(signals: MemorySignal[], title: string) {
  const lines = [`# Source Packet: ${title}`, '', `Generated from ${signals.length} Brain 2.0 memories.`, '']
  signals.forEach((signal, idx) => {
    lines.push(`## ${idx + 1}. ${signal.row.title || 'Untitled'}`)
    lines.push(`- Type: ${signal.type}`)
    lines.push(`- Themes: ${signal.themes.join(', ') || 'Unsorted'}`)
    lines.push(`- Source strength: ${signal.sourceStrength}/100`)
    if (signal.row.createdAt) lines.push(`- Date: ${signal.row.createdAt.slice(0, 10)}`)
    if (signal.row.people) lines.push(`- People: ${signal.row.people}`)
    lines.push(`- Core insight: ${signal.coreInsight}`)
    lines.push(`- Writing angle: ${signal.writingAngle}`)
    const body = signal.row.rewritten || signal.row.original
    if (body) lines.push('', body.trim())
    lines.push('')
  })
  return lines.join('\n')
}
