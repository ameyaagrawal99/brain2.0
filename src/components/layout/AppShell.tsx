import { useEffect, useRef, useState } from 'react'
import { Header }             from './Header'
import { FilterBar }          from './FilterBar'
import { StatsBar }           from './StatsBar'
import { BottomNav }          from './BottomNav'
import { Sidebar }            from './Sidebar'
import { CardView }           from '@/components/views/CardView'
import { TableView }          from '@/components/views/TableView'
import { TaskBoard }          from '@/components/views/TaskBoard'
import { GraphView }          from '@/components/views/GraphView'
import { DetailModal }        from '@/components/modal/DetailModal'
import { NewRowModal }        from '@/components/modal/NewRowModal'
import { MilestoneModal }     from '@/components/modal/MilestoneModal'
import { SettingsPanel }      from '@/components/modal/SettingsPanel'
import { AIPanel }            from '@/components/modal/AIPanel'
import { PWAInstallBanner }   from '@/components/ui/PWAInstallBanner'
import { useBrainStore }      from '@/store/useBrainStore'
import { useSheetSync }       from '@/hooks/useSheetSync'
import { DEMO_ROWS }          from '@/data/demoData'
import { useConfettiCheck }   from '@/components/ui/Confetti'
import { useNotifications }   from '@/hooks/useNotifications'
import { fetchGoogleContacts } from '@/lib/contacts'
import { getAccessToken }     from '@/lib/gsi'
import { Sparkles, X, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function MilestoneBanner() {
  const specialDays          = useBrainStore((s) => s.specialDays)
  const setSelectedMilestone = useBrainStore((s) => s.setSelectedMilestone)
  const [dismissed, setDismissed] = useState(false)

  const today   = new Date().toISOString().slice(0, 10)
  const todayMD = today.slice(5)

  const todayMs       = specialDays.filter(d => d.date === today)
  const anniversaryMs = specialDays.filter(d => d.date !== today && d.date.slice(5) === todayMD)
  const allSpecial    = [...todayMs, ...anniversaryMs]

  if (dismissed || allSpecial.length === 0) return null

  const first  = allSpecial[0]
  const isAnni = first.date !== today && first.date.slice(5) === todayMD
  const extra  = allSpecial.length - 1

  return (
    <div className="relative overflow-hidden animate-slideUp">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 opacity-90" />
      <div className="milestone-shimmer absolute inset-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center gap-3">
        <span className="text-xl shrink-0 select-none drop-shadow">
          {isAnni ? '🎂' : '🎉'}
        </span>
        <button
          onClick={() => setSelectedMilestone(first)}
          className="flex-1 flex items-center gap-2 text-left min-w-0"
        >
          <div className="min-w-0">
            <span className="text-sm font-bold text-white drop-shadow-sm">
              {isAnni ? 'Anniversary: ' : 'Today: '}
              <span className="font-extrabold">{first.title}</span>
            </span>
            {extra > 0 && (
              <span className="ml-2 text-xs text-white/70">+{extra} more</span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-white/70 shrink-0" />
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export function AppShell() {
  const viewMode            = useBrainStore((s) => s.viewMode)
  const demoMode            = useBrainStore((s) => s.settings.demoMode)
  const setRows             = useBrainStore((s) => s.setRows)
  const selectedRow         = useBrainStore((s) => s.selectedRow)
  const showNewRow          = useBrainStore((s) => s.showNewRow)
  const setShowNewRow       = useBrainStore((s) => s.setShowNewRow)
  const showSettings        = useBrainStore((s) => s.showSettings)
  const showAIPanel         = useBrainStore((s) => s.showAIPanel)
  const selectionMode       = useBrainStore((s) => s.selectionMode)
  const selectedCardIndices = useBrainStore((s) => s.selectedCardIndices)
  const clearCardSelection  = useBrainStore((s) => s.clearCardSelection)
  const setShowAIPanel      = useBrainStore((s) => s.setShowAIPanel)
  const selectedMilestone   = useBrainStore((s) => s.selectedMilestone)
  const showNewMilestone    = useBrainStore((s) => s.showNewMilestone)
  const setShowNewMilestone = useBrainStore((s) => s.setShowNewMilestone)

  const setContacts         = useBrainStore((s) => s.setContacts)
  const setContactsConnected = useBrainStore((s) => s.setContactsConnected)

  const { refresh, refreshConfig } = useSheetSync()
  const hasLoadedRef = useRef(false)

  useConfettiCheck()
  useNotifications()

  // Attempt to silently fetch Google Contacts once after data is loaded.
  // Succeeds only if the user's token already covers the contacts.readonly scope.
  // Silent: no error shown if it doesn't work (user can grant access in Settings).
  useEffect(() => {
    if (demoMode) return
    const token = getAccessToken()
    if (!token) return
    fetchGoogleContacts(token).then((contacts) => {
      if (contacts.length > 0) {
        setContacts(contacts)
        setContactsConnected(true)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode])

  // Handle PWA shortcut URLs (e.g. ?action=new-entry from manifest shortcuts)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const view   = params.get('view')
    if (action === 'new-entry')     setShowNewRow(true)
    if (action === 'new-milestone') setShowNewMilestone(true)
    if (view === 'board')           useBrainStore.getState().setViewMode('board')
    if (action || view) {
      // Clean the URL without reloading
      window.history.replaceState({}, '', window.location.pathname)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (demoMode) {
      setRows(DEMO_ROWS)
      hasLoadedRef.current = true
      return
    }
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true
      const t = setTimeout(() => {
        Promise.all([refresh(), refreshConfig()]).catch(() => {})
      }, 100)
      return () => clearTimeout(t)
    }
  }, [demoMode, refresh, refreshConfig, setRows])

  // Lock body scroll when any modal is open
  useEffect(() => {
    const isDesktop = window.innerWidth >= 640
    const aiLocks   = showAIPanel && !isDesktop
    const locked    = !!(selectedRow || showNewRow || showSettings || aiLocks || selectedMilestone || showNewMilestone)
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [selectedRow, showNewRow, showSettings, showAIPanel, selectedMilestone, showNewMilestone])

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header />
      <PWAInstallBanner />
      <MilestoneBanner />
      <FilterBar />
      <StatsBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 w-full max-w-7xl mx-auto overflow-x-auto pb-16 sm:pb-0 min-w-0">
          {viewMode === 'card'  && <CardView />}
          {viewMode === 'table' && <TableView />}
          {viewMode === 'board' && <TaskBoard />}
          {viewMode === 'graph' && <GraphView />}
        </main>
      </div>
      <BottomNav />

      {/* Selection mode floating action bar */}
      {selectionMode && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-ink text-white rounded-2xl px-4 py-3 shadow-2xl">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedCardIndices.length} {selectedCardIndices.length === 1 ? 'card' : 'cards'} selected
          </span>
          {selectedCardIndices.length > 0 && (
            <button
              onClick={() => { setShowAIPanel(true) }}
              className="flex items-center gap-1.5 bg-brand text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-brand/90 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Enhance selected
            </button>
          )}
          <button
            onClick={clearCardSelection}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title="Exit selection mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <DetailModal />
      <NewRowModal />
      <MilestoneModal />
      <SettingsPanel />
      <AIPanel />
    </div>
  )
}
