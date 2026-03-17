import { useState } from 'react'
import {
  LayoutGrid, Table2, Kanban, GitBranch, Sparkles, Settings,
  SlidersHorizontal, LayoutDashboard, Brain,
} from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { cn } from '@/lib/utils'
import type { ViewMode } from '@/types/sheet'

interface NavItem {
  id: string
  icon: typeof LayoutGrid
  label: string
  mode?: ViewMode
  action?: () => void
}

const VIEWS: NavItem[] = [
  { id: 'stats', icon: LayoutDashboard, label: 'Dashboard', mode: 'stats' },
  { id: 'card',  icon: LayoutGrid,      label: 'Cards',     mode: 'card' },
  { id: 'table', icon: Table2,          label: 'Table',     mode: 'table' },
  { id: 'board', icon: Kanban,          label: 'Board',     mode: 'board' },
  { id: 'graph', icon: GitBranch,       label: 'Graph',     mode: 'graph' },
]

interface TooltipProps { label: string; children: React.ReactNode }

function Tooltip({ label, children }: TooltipProps) {
  const [show, setShow] = useState(false)
  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50 pointer-events-none
          bg-ink text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg
          animate-fadeIn"
        >
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-ink" />
        </div>
      )}
    </div>
  )
}

export function NavRail() {
  const viewMode       = useBrainStore((s) => s.viewMode)
  const setViewMode    = useBrainStore((s) => s.setViewMode)
  const showSidebar    = useBrainStore((s) => s.showSidebar)
  const setShowSidebar = useBrainStore((s) => s.setShowSidebar)
  const setShowAIPanel = useBrainStore((s) => s.setShowAIPanel)
  const setShowSettings = useBrainStore((s) => s.setShowSettings)
  const rows           = useBrainStore((s) => s.rows)
  const specialDays    = useBrainStore((s) => s.specialDays)

  const today   = new Date().toISOString().slice(0, 10)
  const todayMD = today.slice(5)
  const hasSpecial = specialDays.some(d => d.date === today || (d.date !== today && d.date.slice(5) === todayMD))

  const navBtnBase = `
    relative w-10 h-10 flex items-center justify-center rounded-xl
    transition-all duration-150 group
  `

  return (
    <nav className="hidden sm:flex flex-col items-center
      fixed left-0 top-0 bottom-0 z-20
      w-14 border-r border-border bg-surface
      py-3 gap-1"
    >
      {/* Logo */}
      <div className="mb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[rgb(var(--color-brand))] to-[rgb(var(--color-brand-l))]
          flex items-center justify-center shadow-md">
          <Brain className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
        </div>
      </div>

      {/* View switcher */}
      <div className="flex flex-col gap-0.5 w-full px-2">
        {VIEWS.map(({ id, icon: Icon, label, mode }) => {
          const isActive = viewMode === mode
          return (
            <Tooltip key={id} label={label}>
              <button
                onClick={() => mode && setViewMode(mode)}
                className={cn(navBtnBase,
                  isActive
                    ? 'bg-brand/12 text-brand shadow-sm'
                    : 'text-ink3 hover:bg-hover hover:text-ink'
                )}
              >
                <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand rounded-r-full" />
                )}
              </button>
            </Tooltip>
          )
        })}
      </div>

      {/* Divider */}
      <div className="my-2 w-6 h-px bg-border mx-auto" />

      {/* Filters / sidebar */}
      <div className="flex flex-col gap-0.5 w-full px-2">
        <Tooltip label="Filters">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className={cn(navBtnBase,
              showSidebar
                ? 'bg-brand/12 text-brand shadow-sm'
                : 'text-ink3 hover:bg-hover hover:text-ink'
            )}
          >
            <SlidersHorizontal className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            {hasSpecial && !showSidebar && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        </Tooltip>

        <Tooltip label="AI Assistant">
          <button
            onClick={() => setShowAIPanel(true)}
            className={cn(navBtnBase, 'text-ink3 hover:bg-hover hover:text-ink')}
          >
            <Sparkles className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
          </button>
        </Tooltip>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom — entries count pill */}
      {rows.length > 0 && (
        <div className="mb-2 flex flex-col items-center gap-0.5">
          <span className="text-[9px] font-bold text-ink3 tabular-nums leading-none">{rows.length}</span>
          <span className="text-[8px] text-ink3 leading-none">entries</span>
        </div>
      )}

      {/* Settings */}
      <div className="px-2 w-full">
        <Tooltip label="Settings">
          <button
            onClick={() => setShowSettings(true)}
            className={cn(navBtnBase, 'text-ink3 hover:bg-hover hover:text-ink')}
          >
            <Settings className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
          </button>
        </Tooltip>
      </div>

      {/* Upcoming — due today badge */}
      {(() => {
        const todayStr = new Date().toISOString().slice(0, 10)
        const dueToday = rows.filter(r => r.dueDate === todayStr && r.taskStatus !== 'Done').length
        if (!dueToday) return null
        return (
          <div className="absolute top-28 left-1/2 -translate-x-1/2">
            <span className="w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-bold
              flex items-center justify-center shadow-sm pointer-events-none">
              {dueToday > 9 ? '9+' : dueToday}
            </span>
          </div>
        )
      })()}
    </nav>
  )
}
