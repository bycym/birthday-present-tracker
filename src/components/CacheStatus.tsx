import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cacheMessage } from '@/services/cacheMessage'
import type { BirthdaysSource } from '@/services/birthdayService'

export interface CacheStatusProps {
  source?: BirthdaysSource
  fetchedAt?: number
  isRefreshing: boolean
  isOnline: boolean
  onRefresh(): void
}

export function CacheStatus({
  source,
  fetchedAt,
  isRefreshing,
  isOnline,
  onRefresh,
}: CacheStatusProps) {
  if (!source || fetchedAt === undefined) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span role="status">{cacheMessage(source, fetchedAt, isOnline)}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing || !isOnline}
        title={isOnline ? undefined : 'Unavailable while offline'}
      >
        <RefreshCw aria-hidden className={isRefreshing ? 'size-3 animate-spin' : 'size-3'} />
        {isRefreshing ? 'Refreshing…' : 'Refresh'}
      </Button>
    </div>
  )
}
