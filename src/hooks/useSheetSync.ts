import { useCallback } from 'react'
import { fetchRows, updateRow, appendRow, deleteRow } from '@/lib/sheets'
import { ensureConfigSheet, fetchConfig, fetchSpecialDays, appendSpecialDay, deleteSpecialDay, updateSpecialDay } from '@/lib/sheetsConfig'
import { SHEET_ID } from '@/constants/sheet'
import { useBrainStore } from '@/store/useBrainStore'
import { EditableFields, SpecialDay } from '@/types/sheet'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

const CONFIG_READY_KEY = `brain2_config_sheet_ready:${SHEET_ID}`

function hasConfigReadyHint(): boolean {
  try { return localStorage.getItem(CONFIG_READY_KEY) === '1' } catch { return false }
}

function setConfigReadyHint(): void {
  try { localStorage.setItem(CONFIG_READY_KEY, '1') } catch { /* ignore */ }
}

// Internal helper: extract all editable fields from a BrainRow as a snapshot
function rowToEditableSnapshot(row: ReturnType<typeof useBrainStore.getState>['rows'][number]): Partial<EditableFields> {
  return {
    title:       row.title,
    category:    row.category,
    subCategory: row.subCategory,
    original:    row.original,
    rewritten:   row.rewritten,
    actionItems: row.actionItems,
    dueDate:     row.dueDate,
    taskStatus:  row.taskStatus,
    links:       row.links,
    mediaUrl:    row.mediaUrl,
    tags:        row.tags,
    people:      row.people ?? '',
  }
}

export function useSheetSync() {
  const setRows           = useBrainStore((s) => s.setRows)
  const setSyncing        = useBrainStore((s) => s.setSyncing)
  const setLastSyncedAt   = useBrainStore((s) => s.setLastSyncedAt)
  const rows              = useBrainStore((s) => s.rows)
  const updateRowLocally  = useBrainStore((s) => s.updateRowLocally)
  const deleteRowLocally  = useBrainStore((s) => s.deleteRowLocally)
  const setCustomCategories = useBrainStore((s) => s.setCustomCategories)
  const setCustomTags       = useBrainStore((s) => s.setCustomTags)
  const setCategoryColors   = useBrainStore((s) => s.setCategoryColors)
  const setSpecialDays      = useBrainStore((s) => s.setSpecialDays)
  const pushHistory         = useBrainStore((s) => s.pushHistory)
  const popHistory          = useBrainStore((s) => s.popHistory)
  const pushFuture          = useBrainStore((s) => s.pushFuture)
  const popFuture           = useBrainStore((s) => s.popFuture)
  const clearFuture         = useBrainStore((s) => s.clearFuture)
  const setLastBulkRows     = useBrainStore((s) => s.setLastBulkRows)
  const lastBulkRows        = useBrainStore((s) => s.lastBulkRows)

  const refresh = useCallback(async () => {
    setSyncing(true)
    try {
      const data = await fetchRows()
      setRows(data)
      setLastSyncedAt(new Date())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      toast.error(msg)
    } finally {
      setSyncing(false)
    }
  }, [setSyncing, setRows, setLastSyncedAt])

  const refreshConfig = useCallback(async () => {
    try {
      if (!hasConfigReadyHint()) {
        await ensureConfigSheet()
        setConfigReadyHint()
      }
      const [{ categories, tags, colors }, specialDays] = await Promise.all([
        fetchConfig(),
        fetchSpecialDays(),
      ])
      setCustomCategories(categories)
      setCustomTags(tags)
      if (Object.keys(colors).length > 0) {
        setCategoryColors(colors)
      }
      setSpecialDays(specialDays)
    } catch (err) {
      logger.warn('[useSheetSync] refreshConfig non-fatal:', err)
    }
  }, [setCustomCategories, setCustomTags, setCategoryColors, setSpecialDays])

  /**
   * Save fields to the sheet.
   * @param label  Describes the action for undo history display.
   *               Pass '__undo__' or '__redo__' to skip recording history.
   */
  const saveRow = useCallback(async (
    rowIndex: number,
    fields: Partial<EditableFields>,
    label = 'Edit',
  ) => {
    const existing = rows.find((r) => r._rowIndex === rowIndex)
    if (!existing) return false

    // Snapshot BEFORE state for undo history
    const before = rowToEditableSnapshot(existing)

    const updated = { ...existing, ...fields, updatedAt: new Date().toISOString() }

    try {
      const remoteRows = await fetchRows()
      const remote = remoteRows.find((r) => r._rowIndex === rowIndex)
      if (!remote) {
        toast.error('This entry no longer exists in Google Sheets. Refreshing your data.')
        setRows(remoteRows)
        return false
      }

      const remoteUpdated = remote.updatedAt?.trim()
      const localUpdated = existing.updatedAt?.trim()
      if (remoteUpdated && localUpdated && remoteUpdated !== localUpdated) {
        toast.error('This entry changed in Google Sheets. Review the refreshed version before saving again.')
        setRows(remoteRows)
        return false
      }

      updateRowLocally(rowIndex, fields)
      await updateRow(updated)
      await refresh()
      toast.success('Saved')

      // Record history (but not for undo/redo operations themselves)
      if (label !== '__undo__' && label !== '__redo__') {
        pushHistory(rowIndex, before, label)
        clearFuture(rowIndex)
      }
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      toast.error(msg)
      setRows(rows)
      return false
    }
  }, [rows, updateRowLocally, refresh, pushHistory, clearFuture, setRows])

  /** Undo the last save for a given entry — re-saves the previous field values */
  const undoRow = useCallback(async (rowIndex: number) => {
    const entry = popHistory(rowIndex)
    if (!entry) { toast('Nothing to undo for this entry'); return }

    // Snapshot current state for redo
    const current = rows.find((r) => r._rowIndex === rowIndex)
    if (current) {
      pushFuture(rowIndex, {
        fields:  rowToEditableSnapshot(current),
        label:   entry.label,
        savedAt: new Date().toISOString(),
      })
    }

    await saveRow(rowIndex, entry.fields, '__undo__')
    toast.success(`Undone: ${entry.label}`)
  }, [rows, popHistory, pushFuture, saveRow])

  /** Redo the last undone save for a given entry */
  const redoRow = useCallback(async (rowIndex: number) => {
    const entry = popFuture(rowIndex)
    if (!entry) { toast('Nothing to redo'); return }

    // Snapshot current for undo
    const current = rows.find((r) => r._rowIndex === rowIndex)
    if (current) {
      pushHistory(rowIndex, rowToEditableSnapshot(current), entry.label)
    }

    await saveRow(rowIndex, entry.fields, '__redo__')
    toast.success(`Redone: ${entry.label}`)
  }, [rows, popFuture, pushHistory, saveRow])

  /** Undo all entries from the last bulk AI enhance run */
  const undoBulk = useCallback(async () => {
    if (!lastBulkRows.length) { toast('No bulk run to undo'); return }

    let undone = 0
    for (const rowIndex of lastBulkRows) {
      let bulkEntry = popHistory(rowIndex)
      while (bulkEntry && bulkEntry.label !== 'AI: Enhance all') {
        bulkEntry = popHistory(rowIndex)
      }
      if (!bulkEntry) continue

      const current = rows.find((r) => r._rowIndex === rowIndex)
      if (current) {
        pushFuture(rowIndex, {
          fields:  rowToEditableSnapshot(current),
          label:   bulkEntry.label,
          savedAt: new Date().toISOString(),
        })
      }

      await saveRow(rowIndex, bulkEntry.fields, '__undo__')
      undone++
    }

    if (undone > 0) {
      toast.success(`Undone bulk AI on ${undone} entries`)
      setLastBulkRows([])
    } else {
      toast('Bulk history already cleared')
    }
  }, [lastBulkRows, rows, popHistory, pushFuture, saveRow, setLastBulkRows])

  const createRow = useCallback(async (fields: Partial<EditableFields> & { title: string }) => {
    try {
      await appendRow({
        srNo:        '',
        title:       fields.title,
        createdAt:   new Date().toISOString(),
        updatedAt:   '',
        category:    fields.category    ?? '',
        subCategory: fields.subCategory ?? '',
        original:    fields.original    ?? '',
        rewritten:   fields.rewritten   ?? '',
        actionItems: fields.actionItems ?? '',
        dueDate:     fields.dueDate     ?? '',
        taskStatus:  fields.taskStatus  ?? 'Pending',
        links:       fields.links       ?? '',
        mediaUrl:    fields.mediaUrl    ?? '',
        tags:        fields.tags        ?? '',
        messageId:   '',
        people:      fields.people      ?? '',
      })
      await refresh()
      toast.success('Added!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Create failed'
      toast.error(msg)
      throw err
    }
  }, [refresh])

  const removeRow = useCallback(async (rowIndex: number) => {
    deleteRowLocally(rowIndex)
    try {
      await deleteRow(rowIndex)
      await refresh()
      toast.success('Deleted')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed'
      toast.error(msg)
      await refresh()
    }
  }, [deleteRowLocally, refresh])

  const createSpecialDay = useCallback(async (day: SpecialDay) => {
    try {
      await appendSpecialDay(day)
      await refreshConfig()
      toast.success('Milestone saved!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save milestone'
      toast.error(msg)
      throw err
    }
  }, [refreshConfig])

  const removeSpecialDay = useCallback(async (id: string) => {
    try {
      await deleteSpecialDay(id)
      await refreshConfig()
      toast.success('Milestone removed')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove milestone'
      toast.error(msg)
      throw err
    }
  }, [refreshConfig])

  const updateSpecialDayEntry = useCallback(async (day: SpecialDay) => {
    try {
      await updateSpecialDay(day)
      await refreshConfig()
      toast.success('Milestone updated!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update milestone'
      toast.error(msg)
      throw err
    }
  }, [refreshConfig])

  return { refresh, refreshConfig, saveRow, createRow, removeRow, undoRow, redoRow, undoBulk, setLastBulkRows, createSpecialDay, removeSpecialDay, updateSpecialDayEntry }
}
