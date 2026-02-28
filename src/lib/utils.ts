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

/** Predefined color palette for category color customization */
export const COLOR_PALETTE: { name: string; label: string; dot: string; badge: string; border: string }[] = [
  { name: 'violet', label: 'Violet', dot: '#7c3aed', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', border: 'border-l-violet-400 dark:border-l-violet-500' },
  { name: 'blue',   label: 'Blue',   dot: '#2563eb', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',         border: 'border-l-blue-400 dark:border-l-blue-500'   },
  { name: 'green',  label: 'Green',  dot: '#16a34a', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',     border: 'border-l-green-400 dark:border-l-green-500' },
  { name: 'rose',   label: 'Rose',   dot: '#e11d48', badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',         border: 'border-l-rose-400 dark:border-l-rose-500'   },
  { name: 'amber',  label: 'Amber',  dot: '#d97706', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',     border: 'border-l-amber-400 dark:border-l-amber-500' },
  { name: 'orange', label: 'Orange', dot: '#ea580c', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', border: 'border-l-orange-400 dark:border-l-orange-500' },
  { name: 'pink',   label: 'Pink',   dot: '#db2777', badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',         border: 'border-l-pink-400 dark:border-l-pink-500'   },
  { name: 'teal',   label: 'Teal',   dot: '#0d9488', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',         border: 'border-l-teal-400 dark:border-l-teal-500'   },
  { name: 'cyan',   label: 'Cyan',   dot: '#0891b2', badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',         border: 'border-l-cyan-400 dark:border-l-cyan-500'   },
  { name: 'slate',  label: 'Gray',   dot: '#475569', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',     border: 'border-l-slate-400 dark:border-l-slate-500' },
  { name: 'lime',   label: 'Lime',   dot: '#65a30d', badge: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',         border: 'border-l-lime-400 dark:border-l-lime-500'   },
  { name: 'indigo', label: 'Indigo', dot: '#4338ca', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', border: 'border-l-indigo-400 dark:border-l-indigo-500' },
]

const DEFAULT_CATEGORY_BADGE: Record<string, string> = {
  journal:  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  work:     'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
  learning: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300',
  health:   'bg-rose-100   text-rose-700   dark:bg-rose-900/30   dark:text-rose-300',
  finance:  'bg-amber-100  text-amber-700  dark:bg-amber-900/30  dark:text-amber-300',
  ideas:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  personal: 'bg-pink-100   text-pink-700   dark:bg-pink-900/30   dark:text-pink-300',
}

const DEFAULT_CATEGORY_BORDER: Record<string, string> = {
  journal:  'border-l-violet-400 dark:border-l-violet-500',
  work:     'border-l-blue-400   dark:border-l-blue-500',
  learning: 'border-l-green-400  dark:border-l-green-500',
  health:   'border-l-rose-400   dark:border-l-rose-500',
  finance:  'border-l-amber-400  dark:border-l-amber-500',
  ideas:    'border-l-orange-400 dark:border-l-orange-500',
  personal: 'border-l-pink-400   dark:border-l-pink-500',
}

export function categoryColor(category: string): string {
  return DEFAULT_CATEGORY_BADGE[category?.toLowerCase()] ?? 'bg-surface2 text-ink2'
}

/** Returns a left-border Tailwind color class for category-colored cards */
export function categoryBorderColor(category: string): string {
  return DEFAULT_CATEGORY_BORDER[category?.toLowerCase()] ?? 'border-l-transparent'
}

/** Returns the badge color class, using custom color override when set */
export function dynamicCategoryColor(category: string, categoryColors: Record<string, string>): string {
  const colorName = categoryColors[category?.toLowerCase()]
  if (colorName) {
    const palette = COLOR_PALETTE.find((p) => p.name === colorName)
    if (palette) return palette.badge
  }
  return categoryColor(category)
}

/** Returns the border color class, using custom color override when set */
export function dynamicCategoryBorderColor(category: string, categoryColors: Record<string, string>): string {
  const colorName = categoryColors[category?.toLowerCase()]
  if (colorName) {
    const palette = COLOR_PALETTE.find((p) => p.name === colorName)
    if (palette) return palette.border
  }
  return categoryBorderColor(category)
}

/** Returns a subtle background tint class based on task status */
export function statusBgTint(status: string): string {
  const s = status?.toLowerCase() ?? ''
  if (s.includes('blocked')) return 'bg-red-50/40 dark:bg-red-900/10'
  if (s.includes('done') || s.includes('complete')) return 'bg-green-50/40 dark:bg-green-900/10'
  return ''
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
