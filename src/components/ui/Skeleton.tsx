import { cn } from '@/lib/utils'

export function CardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="skeleton h-5 w-16 rounded-md" />
        <div className="skeleton h-5 w-12 rounded-md ml-auto" />
      </div>
      <div className="skeleton h-4 w-4/5 rounded" />
      <div className="skeleton h-3.5 w-full rounded" />
      <div className="skeleton h-3.5 w-3/4 rounded" />
      <div className="skeleton h-3.5 w-5/6 rounded" />
      <div className="flex items-center gap-2 pt-1">
        <div className="skeleton h-4 w-12 rounded-full" />
        <div className="skeleton h-4 w-10 rounded-full" />
        <div className="skeleton h-3.5 w-16 rounded ml-auto" />
      </div>
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}
