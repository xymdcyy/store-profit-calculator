import { cn } from '../../lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-[var(--muted)]', className)}
      {...props}
    />
  )
}

export function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 pb-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="surface p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="surface p-4 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[280px] w-full rounded-lg" />
    </div>
  )
}
