import { useCallback } from 'react'
import { fetchRows, updateRow, appendRow, deleteRow } from '@/lib/sheets'
import { ensureConfigSheet, fetchConfig } from '@/lib/sheetsConfig'
import { useBrainStore } from '@/store/useBrainStore'
import { EditableFields } from '@/types/sheet'
import toast from 'react-hot-toast'

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
  const pushHistory         = useBrainStore((s) => s.pushHistory)
  const popHistory          = useBrainStore((s) => s.popHistory)
  const pushFuture          = useBrainStore((s) => s.pushFuture)
  const popFuture           = useBrainStore((s) => s.popFuture)
  const clearFuture         = useBrainStore((s) => s.clearFuture)
  const setLastBulkRows     = useBrainStore((s) => s.setLastBulkRows)
  const lastBulkRows        = useBrainStore((s) => s.lastBulkRows)
  const entryHistory        = useBrainStore((s) => s.entryHistory)

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
      await ensureConfigSheet()
      const { categories, tags } = await fetchConfig()
      setCustomCategories(categories)
      setCustomTags(tags)
    } catch (err) {
      console.warn('[useSheetSync] refreshConfig non-fatal:', err)
    }
  }, [setCustomCategories, setCustomTags])

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
    if (!existing) return

    // Snapshot BEFORE state for undo history
    const before = rowToEditableSnapshot(existing)

    const updated = { ...existing, ...fields, updatedAt: new Date().toISOString() }
    updateRowLocally(rowIndex, fields)

    try {
      await updateRow(updated)
      await refresh()
      toast.success('Saved')

      // Record history (but not for undo/redo operations themselves)
      if (label !== '__undo__' && label !== '__redo__') {
        pushHistory(rowIndex, before, label)
        clearFuture(rowIndex)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      toast.error(msg)
      await refresh()
    }
  }, [rows, updateRowLocally, refresh, pushHistory, clearFuture])

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
    if (!entry) { toast('Nothing to redo for this entry'); return }

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
      const stack = entryHistory[rowIndex] ?? []
      const bulkEntry = stack.find((e) => e.label === 'AI: Enhance all')
      if (!bulkEntry) continue

      const current = rows.find((r) => r._rowIndex === rowIndex)
      if (current) {
        pushFuture(rowIndex, {
          fields:  rowToEditableSnapshot(current),
          label:   bulkEntry.label,
          savedAt: new Date().toISOString(),
        })
      }
      // pop everything up to and including the bulk entry from history
      popHistory(rowIndex)

      await saveRow(rowIndex, bulkEntry.fields, '__undo__')
      undone++
    }

    if (undone > 0) {
      toast.success(`Undone bulk AI on ${undone} entries`)
      setLastBulkRows([])
    } else {
      toast('Bulk history already cleared')
    }
  }, [lastBulkRows, entryHistory, rows, popHistory, pushFuture, saveRow, setLastBulkRows])

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

  return { refresh, refreshConfig, saveRow, createRow, removeRow, undoRow, redoRow, undoBulk, setLastBulkRows }
}
