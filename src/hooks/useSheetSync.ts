import { useCallback } from 'react'
import { fetchRows, updateRow, appendRow, deleteRow } from '@/lib/sheets'
import { ensureConfigSheet, fetchConfig } from '@/lib/sheetsConfig'
import { useBrainStore } from '@/store/useBrainStore'
import { EditableFields } from '@/types/sheet'
import toast from 'react-hot-toast'

export function useSheetSync() {
  const setRows           = useBrainStore((s) => s.setRows)
  const setSyncing        = useBrainStore((s) => s.setSyncing)
  const setLastSyncedAt   = useBrainStore((s) => s.setLastSyncedAt)
  const rows              = useBrainStore((s) => s.rows)
  const updateRowLocally  = useBrainStore((s) => s.updateRowLocally)
  const deleteRowLocally  = useBrainStore((s) => s.deleteRowLocally)
  const setCustomCategories = useBrainStore((s) => s.setCustomCategories)
  const setCustomTags       = useBrainStore((s) => s.setCustomTags)

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

  const saveRow = useCallback(async (rowIndex: number, fields: Partial<EditableFields>) => {
    const existing = rows.find((r) => r._rowIndex === rowIndex)
    if (!existing) return
    const updated = { ...existing, ...fields, updatedAt: new Date().toISOString() }
    updateRowLocally(rowIndex, fields)
    try {
      await updateRow(updated)
      await refresh()
      toast.success('Saved')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      toast.error(msg)
      await refresh()
    }
  }, [rows, updateRowLocally, refresh])

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

  return { refresh, refreshConfig, saveRow, createRow, removeRow }
}
