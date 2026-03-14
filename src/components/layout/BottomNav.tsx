import { useState } from 'react'
import { LayoutGrid, Table2, Kanban, Plus, Sparkles, X, FileText } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { cn } from '@/lib/utils'
import { ViewMode } from '@/types/sheet'

const TABS: { mode: ViewMode; Icon: typeof LayoutGrid; label: string }[] = [
  { mode: 'card',  Icon: LayoutGrid, label: 'Cards' },
  { mode: 'table', Icon: Table2,     label: 'Table' },
  { mode: 'board', Icon: Kanban,     label: 'Board' },
]

export function BottomNav() {
  const viewMode          = useBrainStore((s) => s.viewMode)
  const setViewMode       = useBrainStore((s) => s.setViewMode)
  const setShowNewRow     = useBrainStore((s) => s.setShowNewRow)
  const setShowNewMilestone = useBrainStore((s) => s.setShowNewMilestone)
  const specialDays       = useBrainStore((s) => s.specialDays)

  const [showNewMenu, setShowNewMenu] = useState(false)

  const today   = new Date().toISOString().slice(0, 10)
  const todayMD = today.slice(5)
  const specialCount = specialDays.filter(
    (d) => d.date === today || (d.date !== today && d.date.slice(5) === todayMD)
  ).length

  return (
    <>
      {/* New menu popup */}
      {showNewMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            onClick={() => setShowNewMenu(false)}
          />
          {/* Menu sheet */}
          <div className="fixed bottom-16 left-0 right-0 z-50 sm:hidden px-4 pb-2 animate-slideUp">
            <div className="bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold text-ink">Create new</span>
                <button
                  onClick={() => setShowNewMenu(false)}
                  className="w-6 h-6 flex items-center justify-center text-ink3 hover:text-ink rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => { setShowNewRow(true); setShowNewMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-hover transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">New Entry</p>
                  <p className="text-xs text-ink3">Add a knowledge or task entry</p>
                </div>
              </button>
              <div className="mx-4 h-px bg-border" />
              <button
                onClick={() => { setShowNewMilestone(true); setShowNewMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-hover transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">New Milestone</p>
                  <p className="text-xs text-ink3">Save a special day or anniversary</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-sm border-t border-border safe-bottom flex items-center">
        {TABS.map(({ mode, Icon, label }) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors',
              viewMode === mode ? 'text-brand' : 'text-ink3'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}

        {/* New button — opens menu with Entry + Milestone */}
        <button
          onClick={() => setShowNewMenu((v) => !v)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
        >
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center transition-transform',
            showNewMenu ? 'bg-ink scale-95' : 'bg-brand',
          )}>
            {showNewMenu
              ? <X className="w-4 h-4 text-white" />
              : <Plus className="w-4 h-4 text-white" />
            }
          </div>
          <span className="text-[10px] font-medium text-ink3">New</span>
          {/* Memories badge */}
          {specialCount > 0 && !showNewMenu && (
            <span className="absolute top-1.5 right-[calc(50%-10px)] w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none animate-pulse pointer-events-none">
              {specialCount}
            </span>
          )}
        </button>
      </nav>
    </>
  )
}
