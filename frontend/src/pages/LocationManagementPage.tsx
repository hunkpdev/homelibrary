import { type MouseEvent, lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteRoom, fetchAllRooms } from '@/api/roomApi'
import type { RoomResponse } from '@/api/types'
import { useLocationStore } from '@/store/locationStore'
import { useAuthStore } from '@/store/authStore'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { MutationButton } from '@/components/common/MutationButton'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { LocationFormModal } from '@/components/locations/LocationFormModal'
import { RoomFormModal } from '@/components/rooms/RoomFormModal'
import { DeleteModal } from '@/components/ui/DeleteModal'
import { EMPTY_LOCATION_FILTERS } from '@/components/locations/LocationFiltersSheet'
import { LocationCardView } from '@/pages/LocationCardView'
import type { LocationGridViewFilterState } from '@/pages/LocationGridView'

const LocationGridView = lazy(() => import('@/pages/LocationGridView'))

function GridLoadingFallback() {
  return (
    <div className="flex w-full items-center justify-center" style={{ height: 500 }}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export function LocationManagementPage() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const isAdmin = useAuthStore(s => s.user?.role === 'ADMIN')
  const isDemo = useAuthStore(s => s.user?.role === 'DEMO')
  const { locationsRefreshTrigger, incrementRefreshTrigger } = useLocationStore()

  const [panelOpen, setPanelOpen] = useState(!isMobile)
  useEffect(() => setPanelOpen(!isMobile), [isMobile])
  const [allRooms, setAllRooms] = useState<RoomResponse[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [roomFormOpen, setRoomFormOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<RoomResponse | undefined>(undefined)
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<RoomResponse | undefined>(undefined)
  const [locationFormOpen, setLocationFormOpen] = useState(false)
  const [defaultRoomId, setDefaultRoomId] = useState<string | undefined>(undefined)

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name,asc')
  const [filters, setFilters] = useState(EMPTY_LOCATION_FILTERS)
  // Bumped on room mutations and location creation — the only events that should fully reset the
  // card list. Location edit/delete update their own card in place instead (see LocationCardView),
  // so they must not feed into this signal even though they still bump locationsRefreshTrigger
  // above (which the Rooms panel below and the grid view both key their own refresh off of).
  const [cardListResetSignal, setCardListResetSignal] = useState(0)

  useEffect(() => {
    setLoadError(null)
    fetchAllRooms()
      .then(setAllRooms)
      .catch(() => setLoadError(t('common.errorUnexpected')))
  }, [locationsRefreshTrigger, t])

  function handleRoomOrCreateSuccess() {
    incrementRefreshTrigger()
    setCardListResetSignal(s => s + 1)
  }

  function handleFilterStateCapture(state: LocationGridViewFilterState) {
    setSearch(state.search)
    setSort(state.sort)
    setFilters(state.filters)
  }

  const handleOpenCreateRoom = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    setEditingRoom(undefined)
    setRoomFormOpen(true)
  }, [])

  const handleOpenEditRoom = useCallback((room: RoomResponse) => {
    setEditingRoom(room)
    setRoomFormOpen(true)
  }, [])

  const handleOpenCreateLocation = useCallback((roomId: string) => {
    setDefaultRoomId(roomId)
    setLocationFormOpen(true)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">{t('locations.pageTitle')}</h1>
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {/* ── Rooms panel ── */}
      <Collapsible open={panelOpen} onOpenChange={setPanelOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer items-center justify-between rounded-t-md border bg-card px-4 py-2 hover:opacity-70">
            <span className="flex items-center gap-2 text-sm font-medium text-card-foreground">
              {panelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {t('locations.rooms.panelTitle')}
            </span>
            {(isAdmin || isDemo) && (
              <Button size="sm" variant="outline" onClick={handleOpenCreateRoom}>
                <Plus className="h-4 w-4 mr-1 text-primary" />
                {t('locations.rooms.newRoom')}
              </Button>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="rounded-b-md border border-t-0 bg-card divide-y">
            {allRooms.map(room => (
              <div key={room.id} className="flex items-center justify-between px-4 py-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-card-foreground">{room.name}</span>
                    <Badge variant="secondary">{room.locationCount} {t('locations.rooms.locationCount', { count: room.locationCount })}</Badge>
                  </div>
                  {room.description && (
                    <span className="text-xs text-muted-foreground truncate">{room.description}</span>
                  )}
                </div>
                {(isAdmin || isDemo) && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('common.edit')} onClick={() => handleOpenEditRoom(room)}>
                      <Pencil className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t('locations.rooms.addLocation')}
                      onClick={() => handleOpenCreateLocation(room.id)}
                    >
                      <Plus className="h-3.5 w-3.5 text-primary" />
                    </Button>
                    {room.locationCount === 0 && (
                      <MutationButton
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        aria-label={t('common.delete')}
                        onClick={() => setDeleteRoomTarget(room)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </MutationButton>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {isMobile ? (
        <LocationCardView
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          filters={filters}
          onFiltersChange={setFilters}
          rooms={allRooms}
          cardListResetSignal={cardListResetSignal}
        />
      ) : (
        <Suspense fallback={<GridLoadingFallback />}>
          <LocationGridView
            initialFilterState={{ search, sort, filters }}
            onFilterStateCapture={handleFilterStateCapture}
            rooms={allRooms}
          />
        </Suspense>
      )}

      <RoomFormModal
        open={roomFormOpen}
        onClose={() => setRoomFormOpen(false)}
        onSuccess={handleRoomOrCreateSuccess}
        room={editingRoom}
      />
      <DeleteModal
        open={deleteRoomTarget !== undefined}
        onClose={() => setDeleteRoomTarget(undefined)}
        onSuccess={handleRoomOrCreateSuccess}
        onDelete={() => deleteRoom(deleteRoomTarget!.id)}
        title={t('locations.rooms.delete.title')}
        description={t('locations.rooms.delete.confirm', { name: deleteRoomTarget?.name ?? '' })}
        errorConflictMessage={t('locations.rooms.delete.errorConflict')}
      />
      <LocationFormModal
        open={locationFormOpen}
        onClose={() => setLocationFormOpen(false)}
        onSuccess={handleRoomOrCreateSuccess}
        rooms={allRooms}
        defaultRoomId={defaultRoomId}
      />
    </div>
  )
}
