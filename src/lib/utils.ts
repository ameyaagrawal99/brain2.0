import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(str: string): string {
  if (!str) return ''
  const d = new Date(str)
  if (isNaN(d.getTime())) return str
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatRelative(str: string): string {
  if (!str) return ''
  const d = new Date(str)
  if (isNaN(d.getTime())) return str
  const diff = Date.now() - d.getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return formatDate(str)
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function truncate(str: string, len = 120): string {
  if (!str || str.length <= len) return str
  return str.slice(0, len).trimEnd() + '…'
}

export function parseTags(tagStr: string): string[] {
  if (!tagStr) return []
  return tagStr.split(/[,;|]+/).map((t) => t.trim()).filter(Boolean)
}

export function statusColor(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('done') || s.includes('complete')) return 'ok'
  if (s.includes('progress') || s.includes('doing')) return 'info'
  if (s.includes('block') || s.includes('stuck'))    return 'danger'
  if (s.includes('review'))                           return 'warn'
  return 'ink3'
}

export function categoryColor(cat: string): string {
  const palette = ['brand', 'info', 'ok', 'warn', 'purple', 'accent', 'danger']
  let h = 0
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) & 0xffff
  return palette[h % palette.length]
}
