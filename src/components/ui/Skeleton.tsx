import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function CardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
      <Skeleton className="h-5 w-3/4 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-2/3 rounded" />
      <div className="flex gap-2 mt-1">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  )
}
