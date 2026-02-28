import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useBrainStore, AppSettings, ThemeMode, ThemeColor, FontMode } from '@/store/useBrainStore'
import { useAuth } from '@/hooks/useAuth'
import { appendConfigCategory, appendConfigTag, deleteConfigItem, saveColorConfig, deleteColorConfig } from '@/lib/sheetsConfig'
import { cn, COLOR_PALETTE } from '@/lib/utils'
import { Eye, EyeOff, Sun, Moon, Monitor, Palette, Type, Bell, LogOut, RotateCcw, Plus, X, Tag, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const BUILT_IN_CATEGORIES = ['journal', 'work', 'learning', 'health', 'finance', 'ideas', 'personal']

export function SettingsPanel() {
  const showSettings    = useBrainStore((s) => s.showSettings)
  const setShowSettings = useBrainStore((s) => s.setShowSettings)
  const settings        = useBrainStore((s) => s.settings)
  const updateSettings  = useBrainStore((s) => s.updateSettings)
  const resetSettings   = useBrainStore((s) => s.resetSettings)
  const customCats      = useBrainStore((s) => s.customCategories)
  const customTags      = useBrainStore((s) => s.customTags)
  const rows            = useBrainStore((s) => s.rows)
  const categoryColors       = useBrainStore((s) => s.categoryColors)
  const updateCategoryColor  = useBrainStore((s) => s.updateCategoryColor)
  const removeCategoryColor  = useBrainStore((s) => s.removeCategoryColor)
  const addCustomCategory    = useBrainStore((s) => s.addCustomCategory)
  const addCustomTag         = useBrainStore((s) => s.addCustomTag)
  const removeCustomCategory = useBrainStore((s) => s.removeCustomCategory)
  const removeCustomTag      = useBrainStore((s) => s.removeCustomTag)
  const { signOut }     = useAuth()

  const [showKey, setShowKey] = useState(false)
  const [newCat,  setNewCat]  = useState('')
  const [newTag,  setNewTag]  = useState('')
  const [savingCat, setSavingCat] = useState(false)
  const [savingTag, setSavingTag] = useState(false)
  const [savingColor, setSavingColor] = useState<string | null>(null)

  // All visible categories: built-in + from rows + custom (deduped)
  const rowCategories = [...new Set(rows.map((r) => r.category).filter(Boolean))].sort()
  const allCategories = [...new Set([...BUILT_IN_CATEGORIES, ...rowCategories, ...customCats])].sort()

  function toggle(key: keyof AppSettings) {
    updateSettings({ [key]: !settings[key as keyof AppSettings] } as Partial<AppSettings>)
  }

  async function handleSetCategoryColor(category: string, colorName: string) {
    const key = category.toLowerCase()
    // Toggle off if same color selected
    if (categoryColors[key] === colorName) {
      removeCategoryColor(key)
      setSavingColor(key)
      try {
        await deleteColorConfig(key)
        toast.success(`Color reset for ${category}`)
      } catch {
        toast.error('Failed to update color in Google Sheet')
      } finally {
        setSavingColor(null)
      }
      return
    }
    updateCategoryColor(key, colorName)
    setSavingColor(key)
    try {
      await saveColorConfig(key, colorName)
      toast.success(`Color saved for ${category}`)
    } catch {
      toast.error('Failed to save color to Google Sheet')
    } finally {
      setSavingColor(null)
    }
  }

  async function handleResetCategoryColor(category: string) {
    const key = category.toLowerCase()
    removeCategoryColor(key)
    try {
      await deleteColorConfig(key)
    } catch {
      // non-fatal
    }
  }

  function handleSignOut() {
    signOut()
    setShowSettings(false)
    toast.success('Signed out')
  }

  async function handleAddCategory() {
    const val = newCat.trim()
    if (!val) return
    setSavingCat(true)
    try {
      await appendConfigCategory(val)
      addCustomCategory(val)
      setNewCat('')
      toast.success(`Category "${val}" added`)
    } catch {
      toast.error('Failed to save category')
    } finally {
      setSavingCat(false)
    }
  }

  async function handleRemoveCategory(cat: string) {
    try {
      await deleteConfigItem('category', cat)
      removeCustomCategory(cat)
      toast.success(`Category removed`)
    } catch {
      toast.error('Failed to remove category')
    }
  }

  async function handleAddTag() {
    const val = newTag.trim().replace(/^#/, '').toLowerCase()
    if (!val) return
    setSavingTag(true)
    try {
      await appendConfigTag(val)
      addCustomTag(val)
      setNewTag('')
      toast.success(`Tag "${val}" added`)
    } catch {
      toast.error('Failed to save tag')
    } finally {
      setSavingTag(false)
    }
  }

  async function handleRemoveTag(tag: string) {
    try {
      await deleteConfigItem('tag', tag)
      removeCustomTag(tag)
      toast.success(`Tag removed`)
    } catch {
      toast.error('Failed to remove tag')
    }
  }

  const themes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'light',  label: 'Light',  icon: Sun },
    { value: 'dark',   label: 'Dark',   icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  const colors: { value: ThemeColor; label: string; css: string }[] = [
    { value: 'indigo', label: 'Indigo', css: 'bg-indigo-500' },
    { value: 'warm',   label: 'Warm',   css: 'bg-amber-600' },
    { value: 'green',  label: 'Green',  css: 'bg-green-600' },
    { value: 'rose',   label: 'Rose',   css: 'bg-rose-600' },
  ]

  const fonts: { value: FontMode; label: string; sample: string }[] = [
    { value: 'sans',  label: 'Inter (sans)',  sample: 'Clean & modern' },
    { value: 'serif', label: 'Lora (serif)',  sample: 'Warm & literary' },
  ]

  const inputCls = 'flex-1 min-w-0 px-2.5 py-1.5 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/40'

  return (
    <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings" size="md">
      <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">

        {/* Theme Mode */}
        <Section title="Appearance" icon={<Sun className="w-3.5 h-3.5" />}>
          <div className="grid grid-cols-3 gap-2">
            {themes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => updateSettings({ themeMode: value })}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3 rounded-lg border text-xs font-medium transition-colors',
                  settings.themeMode === value
                    ? 'border-brand bg-brand/8 text-brand'
                    : 'border-border text-ink2 hover:bg-hover'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </Section>

        {/* Color */}
        <Section title="Accent color" icon={<Palette className="w-3.5 h-3.5" />}>
          <div className="flex gap-3">
            {colors.map(({ value, label, css }) => (
              <button
                key={value}
                onClick={() => updateSettings({ themeColor: value })}
                className="flex flex-col items-center gap-1.5 group"
                title={label}
              >
                <div className={cn(
                  'w-7 h-7 rounded-full transition-all ring-offset-2 ring-offset-surface',
                  css,
                  settings.themeColor === value ? 'ring-2 ring-offset-2' : 'group-hover:scale-110',
                )} />
                <span className="text-[10px] text-ink3">{label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Font */}
        <Section title="Body font" icon={<Type className="w-3.5 h-3.5" />}>
          <div className="grid grid-cols-2 gap-2">
            {fonts.map(({ value, label, sample }) => (
              <button
                key={value}
                onClick={() => updateSettings({ fontMode: value })}
                className={cn(
                  'flex flex-col gap-1 p-3 rounded-lg border text-left transition-colors',
                  settings.fontMode === value
                    ? 'border-brand bg-brand/8'
                    : 'border-border hover:bg-hover'
                )}
              >
                <span className={cn(
                  'text-sm font-medium',
                  value === 'serif' ? 'font-serif' : 'font-sans',
                  settings.fontMode === value ? 'text-brand' : 'text-ink'
                )}>
                  {label}
                </span>
                <span className={cn(
                  'text-xs text-ink3',
                  value === 'serif' ? 'font-serif' : 'font-sans'
                )}>
                  {sample}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* OpenAI Key */}
        <Section title="OpenAI API key" icon={<span className="text-xs">🤖</span>}>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.openAiKey}
              onChange={(e) => updateSettings({ openAiKey: e.target.value })}
              className="w-full px-3 py-2.5 pr-10 text-sm bg-surface2 border border-border rounded-lg text-ink placeholder:text-ink3 focus:outline-none focus:ring-2 focus:ring-brand/50 font-mono"
              placeholder="sk-..."
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-ink3 mt-1.5">Stored locally in your browser. Used for AI features only.</p>
        </Section>

        {/* Custom Categories & Tags — only in live mode */}
        {!settings.demoMode && (
          <Section title="Custom categories" icon={<FolderOpen className="w-3.5 h-3.5" />}>
            <div className="flex gap-2 mb-2">
              <input
                className={inputCls}
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="e.g. Research"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <Button size="sm" variant="primary" onClick={handleAddCategory} loading={savingCat}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {customCats.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customCats.map((cat) => (
                  <span key={cat} className="flex items-center gap-1 text-xs bg-surface2 border border-border rounded-lg px-2 py-1">
                    {cat}
                    <button onClick={() => handleRemoveCategory(cat)} className="text-ink3 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        {!settings.demoMode && (
          <Section title="Custom tags" icon={<Tag className="w-3.5 h-3.5" />}>
            <div className="flex gap-2 mb-2">
              <input
                className={inputCls}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="e.g. deepwork"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button size="sm" variant="primary" onClick={handleAddTag} loading={savingTag}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            {customTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customTags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-surface2 border border-border rounded-lg px-2 py-1">
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="text-ink3 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* Category Colors */}
        <Section title="Category colors" icon={<Palette className="w-3.5 h-3.5" />}>
          <p className="text-xs text-ink3 mb-3">
            Colors are saved to your Google Sheet and applied on every device and login.
            Click a color to apply — click the same color to reset to default.
          </p>
          <div className="space-y-3">
            {allCategories.map((cat) => {
              const key = cat.toLowerCase()
              const current = categoryColors[key]
              const isSaving = savingColor === key
              const currentPalette = COLOR_PALETTE.find((p) => p.name === current)
              return (
                <div key={cat} className="flex items-center gap-3">
                  {/* Category name + current badge preview */}
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <span className={cn(
                      'text-[11px] font-medium px-1.5 py-0.5 rounded truncate max-w-full',
                      currentPalette ? currentPalette.badge : 'bg-surface2 text-ink2'
                    )}>
                      {cat}
                    </span>
                    {isSaving && <span className="text-[10px] text-ink3 animate-pulse">saving…</span>}
                  </div>
                  {/* Color palette dots */}
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {COLOR_PALETTE.map((palette) => (
                      <button
                        key={palette.name}
                        onClick={() => handleSetCategoryColor(cat, palette.name)}
                        title={palette.label}
                        disabled={isSaving}
                        className={cn(
                          'w-5 h-5 rounded-full transition-all ring-offset-1 ring-offset-surface disabled:opacity-50',
                          current === palette.name ? 'ring-2 ring-brand scale-110' : 'hover:scale-110'
                        )}
                        style={{ backgroundColor: palette.dot }}
                      />
                    ))}
                    {/* Reset button */}
                    {current && (
                      <button
                        onClick={() => handleResetCategoryColor(cat)}
                        disabled={isSaving}
                        title="Reset to default"
                        className="w-5 h-5 rounded-full border border-border bg-surface2 flex items-center justify-center text-ink3 hover:text-ink hover:bg-hover transition-colors disabled:opacity-50"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" icon={<Bell className="w-3.5 h-3.5" />}>
          <div className="space-y-2">
            <Toggle
              label="Remind me of entries due soon"
              checked={settings.notifyDueSoon}
              onChange={() => toggle('notifyDueSoon')}
            />
            <Toggle
              label="Notify when new entry is added"
              checked={settings.notifyNewEntry}
              onChange={() => toggle('notifyNewEntry')}
            />
          </div>
        </Section>

        {/* Demo mode */}
        <Section title="Demo mode">
          <Toggle
            label="Show sample data (portfolio mode)"
            checked={settings.demoMode}
            onChange={() => toggle('demoMode')}
          />
        </Section>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={resetSettings}>
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to defaults
          </Button>
          <Button variant="danger" size="sm" onClick={handleSignOut}>
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Section({
  title, icon, children,
}: {
  title: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        {icon && <span className="text-ink3">{icon}</span>}
        <h3 className="text-xs font-semibold text-ink2 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Toggle({
  label, checked, onChange,
}: {
  label: string; checked: boolean; onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-hover transition-colors text-left"
    >
      <span className="text-sm text-ink">{label}</span>
      <div className={cn(
        'w-9 h-5 rounded-full transition-colors relative flex-shrink-0',
        checked ? 'bg-brand' : 'bg-border2',
      )}>
        <div className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </div>
    </button>
  )
}
