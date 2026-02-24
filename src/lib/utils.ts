import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatRelative(iso: string): string {
  if (!iso) return ''
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (mins < 1)   return 'just now'
    if (mins < 60)  return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7)   return `${days}d ago`
    return formatDate(iso)
  } catch {
    return iso
  }
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function truncate(text: string, max = 120): string {
  if (!text || text.length <= max) return text
  return text.slice(0, max) + '…'
}

export function parseTags(tags: string): string[] {
  if (!tags) return []
  return tags.split(/[,;|]/).map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
}

export function statusColor(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('done') || s.includes('complete')) return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
  if (s.includes('progress'))                        return 'text-blue-600  bg-blue-50  dark:bg-blue-900/20  dark:text-blue-400'
  if (s.includes('review'))                          return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400'
  if (s.includes('blocked'))                         return 'text-red-600   bg-red-50   dark:bg-red-900/20   dark:text-red-400'
  return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400'
}

export function getStatusDot(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('done') || s.includes('complete')) return 'bg-green-500'
  if (s.includes('progress'))                        return 'bg-blue-500'
  if (s.includes('review'))                          return 'bg-purple-500'
  if (s.includes('blocked'))                         return 'bg-red-500'
  return 'bg-amber-400'
}

export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    journal:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    work:     'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
    learning: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300',
    health:   'bg-rose-100   text-rose-700   dark:bg-rose-900/30   dark:text-rose-300',
    finance:  'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-300',
    ideas:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    personal: 'bg-pink-100   text-pink-700   dark:bg-pink-900/30   dark:text-pink-300',
  }
  return map[category.toLowerCase()] ?? 'bg-surface2 text-ink2'
}

/** Returns true if url is likely an image (by extension or known image host) */
export function isImageUrl(url: string): boolean {
  if (!url?.trim()) return false
  const clean = url.trim().toLowerCase().split('?')[0].split('#')[0]
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|ico)$/.test(clean)) return true
  // Known image hosting domains
  const imageHosts = [
    'images.unsplash.com', 'plus.unsplash.com',
    'imgur.com', 'i.imgur.com',
    'lh3.googleusercontent.com', 'drive.google.com',
    'pbs.twimg.com',
    'cloudinary.com',
    'res.cloudinary.com',
    'storage.googleapis.com',
  ]
  return imageHosts.some((h) => url.includes(h))
}

/** Wraps search query matches in <mark> tags. Returns HTML string. */
export function highlight(text: string, query: string): string {
  if (!query?.trim() || !text) return text
  try {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex   = new RegExp(`(${escaped})`, 'gi')
    return text.replace(regex, '<mark>$1</mark>')
  } catch {
    return text
  }
}
