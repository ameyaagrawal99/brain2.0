import type { BrainRow } from '@/types/sheet'

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Journal: [
    'journal', 'diary', 'reflect', 'reflection', 'grateful', 'gratitude',
    'mood', 'feeling', 'emotion', 'today', 'morning', 'evening', 'night',
    'dream', 'thought', 'memory', 'memoir', 'personal note',
  ],
  Work: [
    'work', 'project', 'meeting', 'client', 'deadline', 'sprint',
    'task', 'office', 'team', 'colleague', 'manager', 'boss', 'review',
    'presentation', 'report', 'salary', 'career', 'job', 'interview',
    'resume', 'professional', 'business', 'startup', 'company',
    'corporate', 'organization', 'kpi', 'deliverable', 'milestone',
  ],
  Learning: [
    'learn', 'study', 'course', 'book', 'read', 'research', 'tutorial',
    'education', 'school', 'college', 'university', 'lecture', 'class',
    'knowledge', 'skill', 'training', 'workshop', 'seminar', 'lesson',
    'certificate', 'exam', 'quiz', 'practice', 'ai', 'technology',
    'programming', 'coding', 'science', 'math', 'language', 'concept',
  ],
  Health: [
    'health', 'exercise', 'workout', 'gym', 'run', 'walk', 'yoga',
    'meditation', 'diet', 'nutrition', 'sleep', 'weight', 'fitness',
    'doctor', 'medical', 'wellness', 'mental health', 'therapy',
    'stress', 'anxiety', 'habit', 'routine', 'self-care', 'water',
  ],
  Finance: [
    'finance', 'money', 'invest', 'budget', 'save', 'expense', 'income',
    'tax', 'stock', 'crypto', 'mutual fund', 'bank', 'loan', 'emi',
    'payment', 'salary', 'profit', 'loss', 'portfolio', 'trading',
  ],
  Ideas: [
    'idea', 'brainstorm', 'concept', 'innovation', 'creative', 'design',
    'plan', 'strategy', 'vision', 'goal', 'inspiration', 'invention',
    'experiment', 'prototype', 'mvp', 'feature', 'product', 'solution',
  ],
  Personal: [
    'family', 'friend', 'relationship', 'love', 'birthday', 'anniversary',
    'travel', 'trip', 'vacation', 'hobby', 'music', 'movie', 'game',
    'food', 'recipe', 'shopping', 'home', 'pet', 'faith', 'spiritual',
    'prayer', 'festival', 'celebration', 'wedding', 'party',
  ],
}

export function isMalformedCategory(category: string): boolean {
  const trimmed = (category ?? '').trim()
  if (!trimmed) return true
  if (trimmed.startsWith('=')) return true
  if (/^[A-Z_]+\(/.test(trimmed)) return true
  if (/^#(REF|NAME|VALUE|ERROR|N\/A|NULL)/.test(trimmed)) return true
  if (trimmed.length > 80) return true
  if (/[\{\}\[\]<>\\]/.test(trimmed) && !trimmed.includes(',')) return true
  return false
}

export function classifyCategory(row: BrainRow, existingCategories: string[]): string {
  const text = [row.title, row.original, row.rewritten, row.tags, row.subCategory]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const scores: Record<string, number> = {}

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (text.includes(kw)) score++
    }
    if (score > 0) scores[category] = score
  }

  const existingLower = existingCategories.map((c) => c.toLowerCase())
  for (const cat of existingCategories) {
    if (cat.toLowerCase() in scores) continue
    const matchKey = Object.keys(CATEGORY_KEYWORDS).find(
      (k) => k.toLowerCase() === cat.toLowerCase(),
    )
    if (matchKey && scores[matchKey]) {
      scores[cat] = scores[matchKey]
    }
  }

  if (row.subCategory?.trim()) {
    const sub = row.subCategory.trim().toLowerCase()
    for (const cat of existingCategories) {
      if (sub.includes(cat.toLowerCase()) || cat.toLowerCase().includes(sub)) {
        scores[cat] = (scores[cat] ?? 0) + 3
      }
    }
  }

  if (row.tags?.trim()) {
    const tags = row.tags.toLowerCase()
    for (const cat of existingCategories) {
      if (tags.includes(cat.toLowerCase())) {
        scores[cat] = (scores[cat] ?? 0) + 2
      }
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  if (sorted.length > 0 && sorted[0][1] >= 1) {
    const bestName = sorted[0][0]
    const existing = existingCategories.find(
      (c) => c.toLowerCase() === bestName.toLowerCase(),
    )
    return existing ?? bestName
  }

  return 'Other'
}

export interface CategoryFix {
  rowIndex: number
  title: string
  oldCategory: string
  newCategory: string
}

export function findMalformedCategories(
  rows: BrainRow[],
  existingCategories: string[],
): CategoryFix[] {
  const fixes: CategoryFix[] = []

  for (const row of rows) {
    if (!isMalformedCategory(row.category)) continue
    const newCategory = classifyCategory(row, existingCategories)
    fixes.push({
      rowIndex: row._rowIndex,
      title: row.title || '(untitled)',
      oldCategory: row.category,
      newCategory,
    })
  }

  return fixes
}
