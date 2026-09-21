import { differenceInYears } from 'date-fns'

/**
 * Single source of truth for "how old is this milestone" — used to pick a
 * consistent color/gradient everywhere a milestone appears (modal hero,
 * dashboard banner, list rows) instead of each surface inventing its own
 * color logic.
 */
export type MilestoneTier = 'celebration' | 'lt1' | 'lt2' | 'lt5' | 'gte5'

export function getMilestoneTier(dateStr: string, isToday: boolean, isAnniversary: boolean): MilestoneTier {
  if (isToday || isAnniversary) return 'celebration'
  const years = differenceInYears(new Date(), new Date(dateStr + 'T12:00:00'))
  if (years < 1) return 'lt1'
  if (years < 2) return 'lt2'
  if (years < 5) return 'lt5'
  return 'gte5'
}

interface TierStyle {
  gradient: string
  badgeBg: string
  badgeBorder: string
  badgeText: string
}

/** Default theme — vivid, saturated tiers. */
const DEFAULT_TIER_STYLES: Record<MilestoneTier, TierStyle> = {
  celebration: { gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',    badgeBg: 'bg-rose-500/10',    badgeBorder: 'border-rose-500/25',    badgeText: 'text-rose-600' },
  lt1:         { gradient: 'from-violet-500 via-purple-500 to-indigo-500', badgeBg: 'bg-violet-500/10',  badgeBorder: 'border-violet-500/25',  badgeText: 'text-violet-600' },
  lt2:         { gradient: 'from-indigo-500 via-blue-500 to-cyan-500',     badgeBg: 'bg-blue-500/10',    badgeBorder: 'border-blue-500/25',    badgeText: 'text-blue-600' },
  lt5:         { gradient: 'from-emerald-500 via-teal-500 to-green-500',   badgeBg: 'bg-emerald-500/10', badgeBorder: 'border-emerald-500/25', badgeText: 'text-emerald-600' },
  gte5:        { gradient: 'from-amber-500 via-orange-500 to-yellow-500',  badgeBg: 'bg-amber-500/10',   badgeBorder: 'border-amber-500/25',   badgeText: 'text-amber-600' },
}

/** Parchment theme — warm, pine/terracotta-harmonious tiers instead of neon brights. */
const PARCHMENT_TIER_STYLES: Record<MilestoneTier, TierStyle> = {
  celebration: { gradient: 'from-amber-600 via-orange-600 to-amber-700',  badgeBg: 'bg-amber-600/10',  badgeBorder: 'border-amber-600/30',  badgeText: 'text-amber-800' },
  lt1:         { gradient: 'from-teal-700 via-emerald-700 to-teal-800',   badgeBg: 'bg-teal-700/10',   badgeBorder: 'border-teal-700/30',   badgeText: 'text-teal-800' },
  lt2:         { gradient: 'from-stone-600 via-amber-700 to-orange-800', badgeBg: 'bg-stone-600/10',  badgeBorder: 'border-stone-600/30',  badgeText: 'text-stone-700' },
  lt5:         { gradient: 'from-emerald-700 via-teal-600 to-cyan-800',   badgeBg: 'bg-emerald-700/10', badgeBorder: 'border-emerald-700/30', badgeText: 'text-emerald-800' },
  gte5:        { gradient: 'from-yellow-800 via-amber-800 to-orange-900', badgeBg: 'bg-yellow-800/10', badgeBorder: 'border-yellow-800/30', badgeText: 'text-yellow-900' },
}

export function getMilestoneStyle(dateStr: string, isToday: boolean, isAnniversary: boolean, parchment: boolean): TierStyle {
  const tier = getMilestoneTier(dateStr, isToday, isAnniversary)
  return (parchment ? PARCHMENT_TIER_STYLES : DEFAULT_TIER_STYLES)[tier]
}
