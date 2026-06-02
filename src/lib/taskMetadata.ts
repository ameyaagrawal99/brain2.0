import type { BrainRow } from '@/types/sheet'

export type TaskPriority = 'High' | 'Medium' | 'Low'
export type DueLane = 'Overdue' | 'Today' | 'Upcoming' | 'No due date' | 'Done'

export interface TaskMetadata {
  priority: TaskPriority | null
  priorityClass: string
  blocked: boolean
  blockerText: string
  recurring: boolean
  recurrence: string
  subtasksTotal: number
  subtasksDone: number
}

const TOKEN_SPLIT = /[\s,#;]+/

function normaliseTokens(text: string | undefined): string[] {
  return (text ?? '')
    .toLowerCase()
    .split(TOKEN_SPLIT)
    .map((token) => token.trim())
    .filter(Boolean)
}

function parseDateOnly(value: string | undefined): Date | null {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function getTaskDueLane(row: BrainRow, now = new Date()): DueLane {
  if ((row.taskStatus ?? '').trim().toLowerCase() === 'done') return 'Done'

  const due = parseDateOnly(row.dueDate)
  if (!due) return 'No due date'

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (due.getTime() < today.getTime()) return 'Overdue'
  if (dayKey(due) === dayKey(today)) return 'Today'
  return 'Upcoming'
}

export function getTaskMetadata(row: BrainRow): TaskMetadata {
  const tokens = normaliseTokens(row.tags)
  const actionText = row.actionItems ?? ''
  const lowerAction = actionText.toLowerCase()

  let priority: TaskPriority | null = null
  if (tokens.some((t) => ['priority-high', 'priority:p1', 'p1', 'urgent', 'high-priority'].includes(t))) {
    priority = 'High'
  } else if (tokens.some((t) => ['priority-medium', 'priority:p2', 'p2', 'medium-priority'].includes(t))) {
    priority = 'Medium'
  } else if (tokens.some((t) => ['priority-low', 'priority:p3', 'p3', 'low-priority'].includes(t))) {
    priority = 'Low'
  }

  const blockerMatch = actionText.match(/(?:blocker|blocked by)\s*[:\-]\s*([^\n]+)/i)
  const blocked = (row.taskStatus ?? '').toLowerCase() === 'blocked'
    || lowerAction.includes('blocker:')
    || lowerAction.includes('blocked by')

  const recurringToken = tokens.find((t) => t === 'recurring' || t.startsWith('recurring-') || t.startsWith('repeat-'))
  const recurring = Boolean(recurringToken)
  const recurrence = recurringToken
    ? recurringToken.replace(/^recurring-?/, '').replace(/^repeat-?/, '') || 'recurring'
    : ''

  const lines = actionText.split('\n').map((line) => line.trim()).filter(Boolean)
  const subtasks = lines.filter((line) => /^([-*]\s*)?(\[[ xX]\]\s*)?(.+)/.test(line) && (
    /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line) || /^\[[ xX]\]\s*/.test(line)
  ))
  const completed = subtasks.filter((line) => /\[[xX]\]/.test(line)).length

  return {
    priority,
    priorityClass: priority === 'High'
      ? 'text-red-700 bg-red-50 border-red-200 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/30'
      : priority === 'Medium'
        ? 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30'
        : priority === 'Low'
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30'
          : '',
    blocked,
    blockerText: blockerMatch?.[1]?.trim() ?? '',
    recurring,
    recurrence,
    subtasksTotal: subtasks.length,
    subtasksDone: completed,
  }
}
