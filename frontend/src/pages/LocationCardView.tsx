import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { deleteLocation, fetchLocations } from '@/api/locationApi'
import type { LocationResponse, RoomResponse } from '@/api/types'
import { useLocationStore } from '@/store/locationStore'
import { useInfiniteBackendList } from '@/hooks/useInfiniteBackendList'
import { InfiniteCardList } from '@/components/common/InfiniteCardList'
import { LocationCard } from '@/components/locations/LocationCard'
import { LocationFilterBar } from '@/components/locations/LocationFilterBar'
import { LocationFiltersSheet } from '@/components/locations/LocationFiltersSheet'
import type { LocationFiltersValues } from '@/components/locations/LocationFiltersSheet'
import { LocationFormModal } from '@/components/locations/LocationFormModal'
import { DeleteModal } from '@/components/ui/DeleteModal'

const PAGE_SIZE = 20

export interface LocationCardViewProps {
  search: string
  onSearchChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  filters: LocationFiltersValues
  onFiltersChange: (filters: LocationFiltersValues) => void
  rooms: RoomResponse[]
  /** Bumped by the parent on room mutations and location creation — the only cases that should
   *  fully reset this list. Location edit/delete are handled locally via updateItem/removeItem. */
  cardListResetSignal: number
}

export function LocationCardView({
  search,
  onSearchChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
  rooms,
  cardListResetSignal,
}: Readonly<LocationCardViewProps>) {
  const { t } = useTranslation()
  const { incrementRefreshTrigger } = useLocationStore()

  const [editingLocation, setEditingLocation] = useState<LocationResponse | undefined>(undefined)
  const [locationFormOpen, setLocationFormOpen] = useState(false)
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<LocationResponse | undefined>(undefined)
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false)

  const fetchPage = useCallback((page: number, size: number) => fetchLocations({
    page,
    size,
    sort,
    name: search || undefined,
    roomId: filters.roomId || undefined,
    description: filters.description || undefined,
  }), [sort, search, filters])

  const resetKey = useMemo(
    () => `${cardListResetSignal}|${sort}|${search}|${JSON.stringify(filters)}`,
    [cardListResetSignal, sort, search, filters]
  )

  const cardList = useInfiniteBackendList<LocationResponse>({ fetchPage, resetKey, pageSize: PAGE_SIZE })

  const activeFilterCount = Object.values(filters).filter(value => value.trim() !== '').length

  const handleOpenEditLocation = useCallback((location: LocationResponse) => {
    setEditingLocation(location)
    setLocationFormOpen(true)
  }, [])

  const handleEditSuccess = useCallback((updated?: LocationResponse) => {
    // A PUT /api/locations/{id} válasza fixen bookCount: 0-t ad vissza (a controller nem számolja
    // újra), ezért a listában lévő korábbi értéket tartjuk meg — szerkesztés nem is változtathatja.
    if (updated) cardList.updateItem(updated.id, prev => ({ ...updated, bookCount: prev.bookCount }))
    incrementRefreshTrigger()
  }, [cardList, incrementRefreshTrigger])

  const handleDeleteSuccess = useCallback(() => {
    if (deleteLocationTarget) cardList.removeItem(deleteLocationTarget.id)
    incrementRefreshTrigger()
  }, [cardList, deleteLocationTarget, incrementRefreshTrigger])

  return (
    <div className="flex flex-col gap-4">
      <LocationFilterBar
        search={search}
        onSearchChange={onSearchChange}
        sort={sort}
        onSortChange={onSortChange}
        activeFilterCount={activeFilterCount}
        onOpenFilters={() => setFiltersSheetOpen(true)}
        resultsCount={cardList.isLoading || cardList.error ? null : cardList.totalElements}
      />

      <InfiniteCardList<LocationResponse>
        items={cardList.items}
        renderItem={location => (
          <LocationCard
            location={location}
            onEdit={handleOpenEditLocation}
            onDelete={setDeleteLocationTarget}
          />
        )}
        isLoading={cardList.isLoading}
        isLoadingMore={cardList.isLoadingMore}
        error={cardList.error}
        hasMore={cardList.hasMore}
        onLoadMore={cardList.loadMore}
        onRetry={cardList.retry}
        emptyMessage={t('locations.cardView.emptyState')}
      />

      <LocationFiltersSheet
        open={filtersSheetOpen}
        onClose={() => setFiltersSheetOpen(false)}
        filters={filters}
        onApply={onFiltersChange}
        rooms={rooms}
      />

      <LocationFormModal
        open={locationFormOpen}
        onClose={() => setLocationFormOpen(false)}
        onSuccess={handleEditSuccess}
        location={editingLocation}
        rooms={rooms}
      />

      <DeleteModal
        open={deleteLocationTarget !== undefined}
        onClose={() => setDeleteLocationTarget(undefined)}
        onSuccess={handleDeleteSuccess}
        onDelete={() => deleteLocation(deleteLocationTarget!.id)}
        title={t('locations.delete.title')}
        description={t('locations.delete.confirm', { name: deleteLocationTarget?.name ?? '' })}
        errorConflictMessage={t('locations.delete.errorConflict')}
      />
    </div>
  )
}
