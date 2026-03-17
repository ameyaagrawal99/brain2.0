import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BrainRow, EditableFields, HistoryEntry, SortKey, SpecialDay, ViewMode } from '@/types/sheet'
import type { Contact } from '@/lib/contacts'

export type ThemeMode  = 'light' | 'dark' | 'system'
export type ThemeColor = 'indigo' | 'warm' | 'green' | 'rose'
export type FontMode   = 'sans' | 'serif'

export interface AppSettings {
  themeMode:      ThemeMode
  themeColor:     ThemeColor
  fontMode:       FontMode
  openAiKey:      string
  demoMode:       boolean
  notifyDueSoon:  boolean
  notifyNewEntry: boolean
}

const DEFAULT_SETTINGS: AppSettings = {
  themeMode:      'light',
  themeColor:     'indigo',
  fontMode:       'sans',
  openAiKey:      '',
  demoMode:       false,
  notifyDueSoon:  true,
  notifyNewEntry: false,
}

export interface AIInstructions {
  quick:  string
  bulk:   string
  digest: string
  chat:   string
  relate: string
}

const DEFAULT_AI_INSTRUCTIONS: AIInstructions = {
  quick:  '',
  bulk:   '',
  digest: '',
  chat:   '',
  relate: '',
}

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  error: string | null
  loading: boolean   // true while silent token refresh is in-flight
}

interface FilterState {
  search:        string
  categories:    string[]
  subCategories: string[]
  statuses:      string[]
  persons:       string[]
  selectedTags:  string[]
  tagMatchMode:  'and' | 'or'
  sortBy:        SortKey
  showToday:     boolean
  dateFrom:      string | null
  dateTo:        string | null
}

const DEFAULT_FILTERS: FilterState = {
  search:        '',
  categories:    [],
  subCategories: [],
  statuses:      [],
  persons:       [],
  selectedTags:  [],
  tagMatchMode:  'and',
  sortBy:        'date-desc',
  showToday:     false,
  dateFrom:      null,
  dateTo:        null,
}

const MAX_HISTORY = 20

interface BrainStore {
  authState:    AuthState
  setAuthState: (s: AuthState) => void

  rows:             BrainRow[]
  setRows:          (rows: BrainRow[]) => void
  updateRowLocally: (rowIndex: number, fields: Partial<EditableFields>) => void
  deleteRowLocally: (rowIndex: number) => void
  reorderRows:      (fromIdx: number, toIdx: number) => void

  isSyncing:       boolean
  setSyncing:      (v: boolean) => void
  lastSyncedAt:    Date | null
  setLastSyncedAt: (d: Date) => void

  viewMode:    ViewMode
  setViewMode: (m: ViewMode) => void

  filters:           FilterState
  setSearch:         (q: string) => void
  toggleCategory:    (c: string) => void
  toggleSubCategory: (c: string) => void
  toggleStatus:      (s: string) => void
  togglePerson:      (name: string) => void
  toggleTag:         (t: string) => void
  setTagMatchMode:   (m: 'and' | 'or') => void
  setSortBy:         (k: SortKey) => void
  setShowToday:      (v: boolean) => void
  setDateRange:      (from: string | null, to: string | null) => void
  clearFilters:      () => void

  // Google Contacts (fetched after auth if user has granted contacts scope)
  contacts:              Contact[]
  setContacts:           (contacts: Contact[]) => void
  contactsConnected:     boolean
  setContactsConnected:  (v: boolean) => void

  // Per-category color overrides (persisted, synced to Google Sheet)
  categoryColors:      Record<string, string>
  setCategoryColors:   (colors: Record<string, string>) => void
  updateCategoryColor: (category: string, color: string) => void
  removeCategoryColor: (category: string) => void

  selectedRow: BrainRow | null
  openModal:   (row: BrainRow) => void
  closeModal:  () => void

  showNewRow:    boolean
  setShowNewRow: (v: boolean) => void

  showAIPanel:    boolean
  setShowAIPanel: (v: boolean) => void

  settings:       AppSettings
  updateSettings: (patch: Partial<AppSettings>) => void
  resetSettings:  () => void

  showSettings:    boolean
  setShowSettings: (v: boolean) => void

  // Custom categories and tags persisted to Config Google Sheet tab
  customCategories:       string[]
  customTags:             string[]
  setCustomCategories:    (cats: string[]) => void
  setCustomTags:          (tags: string[]) => void
  addCustomCategory:      (cat: string) => void
  addCustomTag:           (tag: string) => void
  removeCustomCategory:   (cat: string) => void
  removeCustomTag:        (tag: string) => void

  // Per-entry undo/redo history (in-memory, lost on refresh)
  entryHistory:  Record<number, HistoryEntry[]>
  entryFuture:   Record<number, HistoryEntry[]>
  pushHistory:   (rowIndex: number, fields: Partial<EditableFields>, label: string) => void
  popHistory:    (rowIndex: number) => HistoryEntry | undefined
  pushFuture:    (rowIndex: number, entry: HistoryEntry) => void
  popFuture:     (rowIndex: number) => HistoryEntry | undefined
  clearFuture:   (rowIndex: number) => void

  // Tracks rowIndices touched in the last bulk AI run (for bulk undo)
  lastBulkRows:    number[]
  setLastBulkRows: (indices: number[]) => void

  // Per-action AI custom instructions (persisted to localStorage)
  aiInstructions:       AIInstructions
  updateAiInstructions: (patch: Partial<AIInstructions>) => void

  // Card selection mode (for bulk enhance "selected cards" scope)
  selectionMode:       boolean
  setSelectionMode:    (v: boolean) => void
  selectedCardIndices: number[]
  toggleCardSelection: (rowIndex: number) => void
  clearCardSelection:  () => void

  // Left sidebar
  showSidebar:    boolean
  setShowSidebar: (v: boolean) => void

  // Special Days / Milestones
  specialDays:         SpecialDay[]
  setSpecialDays:      (days: SpecialDay[]) => void
  addSpecialDay:       (day: SpecialDay) => void
  removeSpecialDay:    (id: string) => void
  updateSpecialDayLocally: (day: SpecialDay) => void
  lastConfettiDate:    string | null
  setLastConfettiDate: (d: string) => void

  // Milestone modal / create flow
  selectedMilestone:    SpecialDay | null
  setSelectedMilestone: (day: SpecialDay | null) => void
  showNewMilestone:     boolean
  setShowNewMilestone:  (v: boolean) => void
}

export const useBrainStore = create<BrainStore>()(
  persist(
    (set, get) => ({
      authState: { isAuthenticated: false, token: null, error: null, loading: true },
      setAuthState: (authState) => set({ authState }),

      rows: [],
      setRows: (rows) => set({ rows }),
      updateRowLocally: (rowIndex, fields) =>
        set((state) => ({
          rows: state.rows.map((r) =>
            r._rowIndex === rowIndex ? { ...r, ...fields, _dirty: true } : r
          ),
        })),
      deleteRowLocally: (rowIndex) =>
        set((state) => ({ rows: state.rows.filter((r) => r._rowIndex !== rowIndex) })),
      reorderRows: (fromIdx, toIdx) =>
        set((state) => {
          const items = [...state.rows]
          const [moved] = items.splice(fromIdx, 1)
          items.splice(toIdx, 0, moved)
          return { rows: items }
        }),

      isSyncing: false,
      setSyncing: (isSyncing) => set({ isSyncing }),
      lastSyncedAt: null,
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

      viewMode: 'card',
      setViewMode: (viewMode) => set({ viewMode }),

      filters: DEFAULT_FILTERS,
      setSearch:   (search) => set((s) => ({ filters: { ...s.filters, search } })),
      toggleCategory: (c) =>
        set((s) => {
          const categories = s.filters.categories.includes(c)
            ? s.filters.categories.filter((x) => x !== c)
            : [...s.filters.categories, c]
          return { filters: { ...s.filters, categories } }
        }),
      toggleSubCategory: (c) =>
        set((s) => {
          const subCategories = s.filters.subCategories.includes(c)
            ? s.filters.subCategories.filter((x) => x !== c)
            : [...s.filters.subCategories, c]
          return { filters: { ...s.filters, subCategories } }
        }),
      toggleStatus: (s_) =>
        set((s) => {
          const statuses = s.filters.statuses.includes(s_)
            ? s.filters.statuses.filter((x) => x !== s_)
            : [...s.filters.statuses, s_]
          return { filters: { ...s.filters, statuses } }
        }),
      togglePerson: (name) =>
        set((s) => {
          const persons = s.filters.persons.includes(name)
            ? s.filters.persons.filter((x) => x !== name)
            : [...s.filters.persons, name]
          return { filters: { ...s.filters, persons } }
        }),
      toggleTag: (t) =>
        set((s) => {
          const selectedTags = s.filters.selectedTags.includes(t)
            ? s.filters.selectedTags.filter((x) => x !== t)
            : [...s.filters.selectedTags, t]
          return { filters: { ...s.filters, selectedTags } }
        }),
      setTagMatchMode: (tagMatchMode) => set((s) => ({ filters: { ...s.filters, tagMatchMode } })),
      setSortBy:       (sortBy)       => set((s) => ({ filters: { ...s.filters, sortBy } })),
      setShowToday:    (showToday)    => set((s) => ({ filters: { ...s.filters, showToday } })),
      setDateRange:    (dateFrom, dateTo) => set((s) => ({ filters: { ...s.filters, dateFrom, dateTo, showToday: false } })),
      clearFilters:    ()             => set({ filters: DEFAULT_FILTERS }),

      contacts:             [],
      setContacts:          (contacts) => set({ contacts }),
      contactsConnected:    false,
      setContactsConnected: (contactsConnected) => set({ contactsConnected }),

      categoryColors:      {},
      setCategoryColors:   (categoryColors) => set({ categoryColors }),
      updateCategoryColor: (category, color) =>
        set((s) => ({ categoryColors: { ...s.categoryColors, [category.toLowerCase()]: color } })),
      removeCategoryColor: (category) =>
        set((s) => {
          const next = { ...s.categoryColors }
          delete next[category.toLowerCase()]
          return { categoryColors: next }
        }),

      selectedRow: null,
      openModal:   (selectedRow) => set({ selectedRow }),
      closeModal:  ()            => set({ selectedRow: null }),

      showNewRow:    false,
      setShowNewRow: (showNewRow) => set({ showNewRow }),

      showAIPanel:    false,
      setShowAIPanel: (showAIPanel) => set({ showAIPanel }),

      settings:       DEFAULT_SETTINGS,
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetSettings:  ()      => set({ settings: DEFAULT_SETTINGS }),

      showSettings:    false,
      setShowSettings: (showSettings) => set({ showSettings }),

      customCategories: [],
      customTags:       [],
      setCustomCategories: (customCategories) => set({ customCategories }),
      setCustomTags:       (customTags)       => set({ customTags }),
      addCustomCategory: (cat) =>
        set((s) => ({
          customCategories: s.customCategories.includes(cat)
            ? s.customCategories
            : [...s.customCategories, cat],
        })),
      addCustomTag: (tag) =>
        set((s) => ({
          customTags: s.customTags.includes(tag)
            ? s.customTags
            : [...s.customTags, tag],
        })),
      removeCustomCategory: (cat) =>
        set((s) => ({ customCategories: s.customCategories.filter((c) => c !== cat) })),
      removeCustomTag: (tag) =>
        set((s) => ({ customTags: s.customTags.filter((t) => t !== tag) })),

      // ── Undo / Redo ────────────────────────────────────────────────────
      entryHistory: {},
      entryFuture:  {},

      pushHistory: (rowIndex, fields, label) =>
        set((s) => {
          const prev = s.entryHistory[rowIndex] ?? []
          const next = [{ fields, label, savedAt: new Date().toISOString() }, ...prev].slice(0, MAX_HISTORY)
          return { entryHistory: { ...s.entryHistory, [rowIndex]: next } }
        }),

      popHistory: (rowIndex) => {
        const stack = get().entryHistory[rowIndex] ?? []
        if (!stack.length) return undefined
        const [top, ...rest] = stack
        set((s) => ({ entryHistory: { ...s.entryHistory, [rowIndex]: rest } }))
        return top
      },

      pushFuture: (rowIndex, entry) =>
        set((s) => {
          const prev = s.entryFuture[rowIndex] ?? []
          return { entryFuture: { ...s.entryFuture, [rowIndex]: [entry, ...prev].slice(0, MAX_HISTORY) } }
        }),

      popFuture: (rowIndex) => {
        const stack = get().entryFuture[rowIndex] ?? []
        if (!stack.length) return undefined
        const [top, ...rest] = stack
        set((s) => ({ entryFuture: { ...s.entryFuture, [rowIndex]: rest } }))
        return top
      },

      clearFuture: (rowIndex) =>
        set((s) => ({ entryFuture: { ...s.entryFuture, [rowIndex]: [] } })),

      // ── Bulk run tracking ──────────────────────────────────────────────
      lastBulkRows:    [],
      setLastBulkRows: (lastBulkRows) => set({ lastBulkRows }),

      // ── AI Instructions ────────────────────────────────────────────────
      aiInstructions:       DEFAULT_AI_INSTRUCTIONS,
      updateAiInstructions: (patch) =>
        set((s) => ({ aiInstructions: { ...s.aiInstructions, ...patch } })),

      // ── Card selection mode ────────────────────────────────────────────
      selectionMode:       false,
      setSelectionMode:    (selectionMode) => set({ selectionMode }),
      selectedCardIndices: [],
      toggleCardSelection: (rowIndex) =>
        set((s) => ({
          selectedCardIndices: s.selectedCardIndices.includes(rowIndex)
            ? s.selectedCardIndices.filter((i) => i !== rowIndex)
            : [...s.selectedCardIndices, rowIndex],
        })),
      clearCardSelection: () => set({ selectedCardIndices: [], selectionMode: false }),

      // ── Sidebar ────────────────────────────────────────────────────────
      showSidebar:    false,
      setShowSidebar: (showSidebar) => set({ showSidebar }),

      // ── Special Days / Milestones ──────────────────────────────────────
      specialDays:         [],
      setSpecialDays:      (specialDays) => set({ specialDays }),
      addSpecialDay:       (day) =>
        set((s) => ({ specialDays: [...s.specialDays, day] })),
      removeSpecialDay:    (id) =>
        set((s) => ({ specialDays: s.specialDays.filter((d) => d.id !== id) })),
      updateSpecialDayLocally: (day) =>
        set((s) => ({ specialDays: s.specialDays.map((d) => d.id === day.id ? day : d) })),
      lastConfettiDate:    null,
      setLastConfettiDate: (lastConfettiDate) => set({ lastConfettiDate }),

      // ── Milestone modal ────────────────────────────────────────────────
      selectedMilestone:    null,
      setSelectedMilestone: (selectedMilestone) => set({ selectedMilestone }),
      showNewMilestone:     false,
      setShowNewMilestone:  (showNewMilestone) => set({ showNewMilestone }),
    }),
    {
      name: 'brain2-store',
      partialize: (state) => ({
        settings:          state.settings,
        viewMode:          state.viewMode,
        filters:           { ...DEFAULT_FILTERS, sortBy: state.filters.sortBy },
        aiInstructions:    state.aiInstructions,
        categoryColors:    state.categoryColors,
        lastConfettiDate:  state.lastConfettiDate,
      }),
    }
  )
)
