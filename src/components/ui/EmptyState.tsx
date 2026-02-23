import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon:    LucideIcon
  title:   string
  message: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-xl bg-surface2 border border-border flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-ink3" />
      </div>
      <h3 className="text-sm font-medium text-ink mb-1">{title}</h3>
      <p className="text-sm text-ink2 max-w-xs leading-relaxed">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 text-sm font-medium text-brand hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
