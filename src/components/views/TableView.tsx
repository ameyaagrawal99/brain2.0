import { useBrainStore }  from '@/store/useBrainStore'
import { useFilters }     from '@/hooks/useFilters'
import { EmptyState }     from '@/components/ui/EmptyState'
import { StatusDot }      from '@/components/ui/StatusDot'
import { parseTags, formatDate, truncate } from '@/lib/utils'
import { Search, BookOpen } from 'lucide-react'

export function TableView() {
  const openModal   = useBrainStore((s) => s.openModal)
  const { filteredRows } = useFilters()

  if (!filteredRows.length) {
    return (
      <EmptyState
        icon={filteredRows.length === 0 ? Search : BookOpen}
        title="No entries"
        message="No entries match your current filters."
      />
    )
  }

  return (
    <div className="overflow-x-auto px-4 py-3">
      <table className="w-full text-sm border-separate border-spacing-y-1 min-w-[700px]">
        <thead>
          <tr>
            {['#', 'Title', 'Category', 'Status', 'Due', 'Tags', 'Updated'].map((h) => (
              <th
                key={h}
                className="text-left text-xs font-medium text-ink2 px-3 py-2 first:pl-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => {
            const tags = parseTags(row.tags)
            return (
              <tr
                key={row._rowIndex}
                onClick={() => openModal(row)}
                className="group cursor-pointer"
              >
                <td className="text-xs text-ink3 px-3 py-2.5 first:pl-0 bg-surface group-hover:bg-hover rounded-l-lg w-8">
                  {row.srNo}
                </td>
                <td className="px-3 py-2.5 bg-surface group-hover:bg-hover max-w-[220px]">
                  <div className="font-medium text-ink truncate">{row.title}</div>
                  {(row.rewritten || row.original) && (
                    <div className="text-xs text-ink2 truncate mt-0.5 font-serif">
                      {truncate(row.rewritten || row.original, 80)}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 bg-surface group-hover:bg-hover whitespace-nowrap">
                  <span className="text-xs text-ink2">{row.category}</span>
                  {row.subCategory && (
                    <span className="text-xs text-ink3 ml-1">/ {row.subCategory}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 bg-surface group-hover:bg-hover whitespace-nowrap">
                  {row.taskStatus && (
                    <div className="flex items-center gap-1.5">
                      <StatusDot status={row.taskStatus} />
                      <span className="text-xs text-ink2">{row.taskStatus}</span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 bg-surface group-hover:bg-hover whitespace-nowrap text-xs text-ink2">
                  {row.dueDate ? formatDate(row.dueDate) : '\u2014'}
                </td>
                <td className="px-3 py-2.5 bg-surface group-hover:bg-hover">
                  <div className="flex flex-wrap gap-1 max-w-[160px]">
                    {tags.slice(0, 2).map((t) => (
                      <span key={t} className="tag-chip text-[10px]">#{t}</span>
                    ))}
                    {tags.length > 2 && <span className="text-[10px] text-ink3">+{tags.length - 2}</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 bg-surface group-hover:bg-hover rounded-r-lg text-xs text-ink3 whitespace-nowrap">
                  {formatDate(row.updatedAt || row.createdAt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
