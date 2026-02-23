import { useCallback } from 'react'
import toast from 'react-hot-toast'
import { fetchRows, updateRow, appendRow, deleteRow } from '@/lib/sheets'
import { useBrainStore } from '@/store/useBrainStore'
import { BrainRow, EditableFields } from '@/types/sheet'

export function useSheetSync() {
  const { rows, setRows, updateRowLocally, deleteRowLocally, setSyncing, setLastSyncedAt } = useBrainStore()

  const refresh = useCallback(async () => {
    setSyncing(true)
    const id = toast.loading('Syncing…')
    try {
      const data = await fetchRows()
      setRows(data)
      setLastSyncedAt(new Date())
      toast.success(`Loaded ${data.length} entries`, { id })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Sync failed: ${msg}`, { id })
    } finally {
      setSyncing(false)
    }
  }, [setRows, setSyncing, setLastSyncedAt])

  const saveRow = useCallback(async (rowIndex: number, fields: Partial<EditableFields>) => {
    updateRowLocally(rowIndex, fields)
    const row = rows.find((r) => r._rowIndex === rowIndex)
    if (!row) return

    const updated: BrainRow = {
      ...row,
      ...fields,
      updatedAt: new Date().toISOString(),
      _dirty: false,
    }

    setSyncing(true)
    const id = toast.loading('Saving…')
    try {
      await updateRow(updated)
      const fresh = await fetchRows()
      setRows(fresh)
      setLastSyncedAt(new Date())
      toast.success('Saved ✓', { id })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Save failed: ${msg}`, { id })
    } finally {
      setSyncing(false)
    }
  }, [rows, setRows, setSyncing, setLastSyncedAt, updateRowLocally])

  const createRow = useCallback(async (fields: Partial<EditableFields> & { title: string }) => {
    const now = new Date().toISOString()
    const newRow: Omit<BrainRow, '_rowIndex' | '_dirty'> = {
      srNo:        '',
      title:       fields.title,
      createdAt:   now,
      updatedAt:   now,
      category:    fields.category ?? '',
      subCategory: fields.subCategory ?? '',
      original:    fields.original ?? '',
      rewritten:   fields.rewritten ?? '',
      actionItems: fields.actionItems ?? '',
      dueDate:     fields.dueDate ?? '',
      taskStatus:  fields.taskStatus ?? '',
      links:       fields.links ?? '',
      mediaUrl:    fields.mediaUrl ?? '',
      tags:        fields.tags ?? '',
      messageId:   '',
    }
    setSyncing(true)
    const id = toast.loading('Creating entry…')
    try {
      await appendRow(newRow)
      const fresh = await fetchRows()
      setRows(fresh)
      setLastSyncedAt(new Date())
      toast.success('Entry created ✓', { id })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Create failed: ${msg}`, { id })
    } finally {
      setSyncing(false)
    }
  }, [setRows, setSyncing, setLastSyncedAt])

  const removeRow = useCallback(async (rowIndex: number) => {
    deleteRowLocally(rowIndex)
    setSyncing(true)
    const id = toast.loading('Deleting…')
    try {
      await deleteRow(rowIndex)
      const fresh = await fetchRows()
      setRows(fresh)
      setLastSyncedAt(new Date())
      toast.success('Entry deleted', { id })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Delete failed: ${msg}`, { id })
      await refresh()
    } finally {
      setSyncing(false)
    }
  }, [deleteRowLocally, setRows, setSyncing, setLastSyncedAt, refresh])

  return { refresh, saveRow, createRow, removeRow }
}
