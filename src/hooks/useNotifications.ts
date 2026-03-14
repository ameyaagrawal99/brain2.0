/**
 * useNotifications — browser Notification API integration.
 *
 * Features:
 * - Request notification permission when the user enables notifications in Settings
 * - On app load (or when data changes), check for:
 *   - Overdue tasks
 *   - Tasks due today / in the next 24 hours
 *   - Milestone anniversaries / exact dates
 * - Suppress duplicate notifications within the same session (in-memory set)
 */
import { useEffect, useRef } from 'react'
import { useBrainStore } from '@/store/useBrainStore'
import { parseActionItems } from '@/lib/utils'
import { differenceInYears } from 'date-fns'

const notified = new Set<string>()

function canNotify() {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && Notification.permission === 'granted'
}

function send(title: string, options?: NotificationOptions) {
  if (!canNotify()) return
  try {
    const n = new Notification(title, {
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      ...options,
    })
    // Auto-close after 8 seconds
    setTimeout(() => n.close(), 8000)
  } catch {
    // Silently ignore (e.g. service worker required on some browsers)
  }
}

/** Request permission and return the result */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/** Check current permission status */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export function useNotifications() {
  const settings    = useBrainStore((s) => s.settings)
  const rows        = useBrainStore((s) => s.rows)
  const specialDays = useBrainStore((s) => s.specialDays)
  const hasChecked  = useRef(false)

  // Check once when rows & settings are loaded
  useEffect(() => {
    if (!settings.notifyDueSoon) return
    if (!canNotify()) return
    if (rows.length === 0 && specialDays.length === 0) return
    if (hasChecked.current) return
    hasChecked.current = true

    const today    = new Date()
    const todayStr = today.toISOString().slice(0, 10)
    const todayMD  = todayStr.slice(5)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().slice(0, 10)

    // ── 1. Overdue tasks ──────────────────────────────────────────────
    const overdue = rows.filter(
      (r) => r.dueDate && r.dueDate < todayStr
          && r.taskStatus !== 'Done'
          && r.taskStatus !== 'Complete'
    )
    if (overdue.length > 0) {
      const key = `overdue-${todayStr}`
      if (!notified.has(key)) {
        notified.add(key)
        send(`⚠️ ${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`, {
          body: overdue.slice(0, 3).map((r) => `• ${r.title || 'Untitled'} (due ${r.dueDate})`).join('\n'),
          tag: key,
        })
      }
    }

    // ── 2. Tasks due today ────────────────────────────────────────────
    const dueToday = rows.filter(
      (r) => r.dueDate === todayStr && r.taskStatus !== 'Done' && r.taskStatus !== 'Complete'
    )
    if (dueToday.length > 0) {
      const key = `due-today-${todayStr}`
      if (!notified.has(key)) {
        notified.add(key)
        send(`📅 ${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today`, {
          body: dueToday.slice(0, 3).map((r) => `• ${r.title || 'Untitled'}`).join('\n'),
          tag: key,
        })
      }
    }

    // ── 3. Tasks due tomorrow ─────────────────────────────────────────
    const dueTomorrow = rows.filter(
      (r) => r.dueDate === tomorrowStr && r.taskStatus !== 'Done' && r.taskStatus !== 'Complete'
    )
    if (dueTomorrow.length > 0) {
      const key = `due-tomorrow-${todayStr}`
      if (!notified.has(key)) {
        notified.add(key)
        send(`⏰ ${dueTomorrow.length} task${dueTomorrow.length > 1 ? 's' : ''} due tomorrow`, {
          body: dueTomorrow.slice(0, 3).map((r) => `• ${r.title || 'Untitled'}`).join('\n'),
          tag: key,
        })
      }
    }

    // ── 4. Pending action items (reminder) ───────────────────────────
    let pendingCount = 0
    for (const r of rows) {
      const items = parseActionItems(r.actionItems ?? '')
      pendingCount += items.filter((i) => !i.done).length
    }
    if (pendingCount >= 5) {
      const key = `pending-actions-${todayStr}`
      if (!notified.has(key)) {
        notified.add(key)
        send(`📋 ${pendingCount} action items pending`, {
          body: 'Open Brain 2.0 to check your task list.',
          tag: key,
        })
      }
    }

    // ── 5. Milestones today / anniversaries ───────────────────────────
    const exactToday   = specialDays.filter((d) => d.date === todayStr)
    const anniversaries = specialDays.filter(
      (d) => d.date !== todayStr && d.date.slice(5) === todayMD
    )

    exactToday.forEach((d) => {
      const key = `milestone-today-${d.id}-${todayStr}`
      if (!notified.has(key)) {
        notified.add(key)
        send(`🎉 ${d.emoji ?? ''} Today: ${d.title}`, {
          body: d.description ? d.description.slice(0, 120) : 'Open Brain 2.0 to celebrate!',
          tag: key,
        })
      }
    })

    anniversaries.forEach((d) => {
      const years = differenceInYears(today, new Date(d.date + 'T12:00:00'))
      const key = `milestone-anni-${d.id}-${todayStr}`
      if (!notified.has(key)) {
        notified.add(key)
        send(`🎂 ${years}-year anniversary: ${d.emoji ?? ''} ${d.title}`, {
          body: d.description ? d.description.slice(0, 120) : 'Open Brain 2.0 to relive the memory!',
          tag: key,
        })
      }
    })
  }, [settings.notifyDueSoon, rows, specialDays])
}
