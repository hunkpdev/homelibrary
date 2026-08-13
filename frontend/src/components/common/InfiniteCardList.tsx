import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WithId } from '@/hooks/useInfiniteBackendList'

export interface InfiniteCardListProps<T extends WithId> {
  items: T[]
  renderItem: (item: T) => ReactNode
  isLoading: boolean
  isLoadingMore: boolean
  error: boolean
  hasMore: boolean
  onLoadMore: () => void
  onRetry: () => void
  emptyMessage: ReactNode
}

export function InfiniteCardList<T extends WithId>({
  items,
  renderItem,
  isLoading,
  isLoadingMore,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  emptyMessage,
}: Readonly<InfiniteCardListProps<T>>) {
  const { t } = useTranslation()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || isLoading || error || !hasMore) return

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) onLoadMore()
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isLoading, error, hasMore, onLoadMore])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="infinite-card-list-loading">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <p className="text-sm text-destructive">{t('common.errorUnexpected')}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        {items.map(item => (
          <div key={item.id}>{renderItem(item)}</div>
        ))}
      </div>

      {hasMore && !error && <div ref={sentinelRef} aria-hidden="true" className="h-1" />}

      {isLoadingMore && (
        <div className="flex items-center justify-center py-4" data-testid="infinite-card-list-loading-more">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && items.length > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          <span className="text-destructive">{t('common.errorUnexpected')}</span>
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        </div>
      )}
    </div>
  )
}
