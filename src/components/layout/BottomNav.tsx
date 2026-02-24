import { LayoutGrid, Table2, Kanban, Plus } from 'lucide-react'
import { useBrainStore } from '@/store/useBrainStore'
import { cn } from '@/lib/utils'
import { ViewMode } from '@/types/sheet'

const TABS: { mode: ViewMode; Icon: typeof LayoutGrid; label: string }[] = [
  { mode: 'card',  Icon: LayoutGrid, label: 'Cards' },
  { mode: 'table', Icon: Table2,     label: 'Table' },
  { mode: 'board', Icon: Kanban,     label: 'Board' },
]

export function BottomNav() {
  const viewMode     = useBrainStore((s) => s.viewMode)
  const setViewMode  = useBrainStore((s) => s.setViewMode)
  const setShowNewRow= useBrainStore((s) => s.setShowNewRow)

  return (
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
      {/* New entry button */}
      <button
        onClick={() => setShowNewRow(true)}
        className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-brand"
      >
        <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
          <Plus className="w-4 h-4 text-white" />
        </div>
        <span className="text-[10px] font-medium text-ink3">New</span>
      </button>
    </nav>
  )
}
