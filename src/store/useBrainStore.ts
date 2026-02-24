import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { BrainRow, EditableFields, SortKey, ViewMode } from '@/types/sheet'

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

interface AuthState {
  isAuthenticated: boolean
  token: string | null
  error: string | null
}

interface FilterState {
  search:       string
  category:     string
  subCategory:  string
  status:       string
  selectedTags: string[]
  sortBy:       SortKey
  showToday:    boolean
}

const DEFAULT_FILTERS: FilterState = {
  search:       '',
  category:     '',
  subCategory:  '',
  status:       '',
  selectedTags: [],
  sortBy:       'date-desc',
  showToday:    false,
}

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

  filters:        FilterState
  setSearch:      (q: string) => void
  setCategory:    (c: string) => void
  setSubCategory: (s: string) => void
  setStatus:      (s: string) => void
  toggleTag:      (t: string) => void
  setSortBy:      (k: SortKey) => void
  setShowToday:   (v: boolean) => void
  clearFilters:   () => void

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
}

export const useBrainStore = create<BrainStore>()(
  persist(
    (set) => ({
      authState: { isAuthenticated: false, token: null, error: null },
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
      setSearch:      (search)      => set((s) => ({ filters: { ...s.filters, search } })),
      setCategory:    (category)    => set((s) => ({ filters: { ...s.filters, category } })),
      setSubCategory: (subCategory) => set((s) => ({ filters: { ...s.filters, subCategory } })),
      setStatus:      (status)      => set((s) => ({ filters: { ...s.filters, status } })),
      toggleTag: (t) =>
        set((s) => {
          const tags = s.filters.selectedTags.includes(t)
            ? s.filters.selectedTags.filter((x) => x !== t)
            : [...s.filters.selectedTags, t]
          return { filters: { ...s.filters, selectedTags: tags } }
        }),
      setSortBy:    (sortBy) => set((s) => ({ filters: { ...s.filters, sortBy } })),
      setShowToday: (showToday) => set((s) => ({ filters: { ...s.filters, showToday } })),
      clearFilters: ()       => set({ filters: DEFAULT_FILTERS }),

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
    }),
    {
      name: 'brain2-store',
      partialize: (state) => ({
        settings: state.settings,
        viewMode: state.viewMode,
        filters:  { ...DEFAULT_FILTERS, sortBy: state.filters.sortBy },
      }),
    }
  )
)
