import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, IDatasource, IGetRowsParams } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry, themeQuartz, colorSchemeDark, colorSchemeLight } from 'ag-grid-community'
import { AG_GRID_LOCALE_HU } from '@ag-grid-community/locale'
import { ChevronDown, ChevronUp, Pencil, Trash2, Plus } from 'lucide-react'
import { fetchAllRooms, deleteRoom } from '@/api/roomApi'
import { fetchAllLocations, fetchLocations, deleteLocation } from '@/api/locationApi'
import type { LocationResponse, RoomResponse } from '@/api/types'
import { useLocationStore } from '@/store/locationStore'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { PassthroughFilter } from '@/components/grid/PassthroughFilter'
import { SelectFloatingFilter } from '@/components/grid/SelectFloatingFilter'
import { ClearableTextFloatingFilter } from '@/components/grid/ClearableTextFloatingFilter'
import { ActionCell } from '@/components/locations/ActionCell'

ModuleRegistry.registerModules([AllCommunityModule])

const PAGE_SIZE = 10

// ─── Page component ───────────────────────────────────────────────────────────

export function LocationManagementPage() {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isMobile = useIsMobile()
  const isAdmin = useAuthStore(s => s.user?.role === 'ADMIN')
  const { locationsRefreshTrigger, incrementRefreshTrigger } = useLocationStore()

  const gridRef = useRef<AgGridReact<LocationResponse>>(null)
  const nameFilterRef = useRef<string | undefined>(undefined)
  const roomIdFilterRef = useRef<string | undefined>(undefined)
  const [panelOpen, setPanelOpen] = useState(!isMobile)
  const [allRooms, setAllRooms] = useState<RoomResponse[]>([])
  const [allLocations, setAllLocations] = useState<LocationResponse[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  // ── Initial data load (rooms + locations for dropdowns) ──────────────────
  useEffect(() => {
    Promise.all([fetchAllRooms(), fetchAllLocations()]).then(([rooms, locations]) => {
      setAllRooms(rooms)
      setAllLocations(locations)
    })
  }, [locationsRefreshTrigger])

  // ── Refresh grid when trigger increments ─────────────────────────────────
  useEffect(() => {
    if (locationsRefreshTrigger > 0) {
      gridRef.current?.api?.purgeInfiniteCache()
    }
  }, [locationsRefreshTrigger])

  // ── Datasource for Infinite Row Model ────────────────────────────────────
  const datasource: IDatasource = useMemo(() => ({
    getRows(params: IGetRowsParams) {
      const page = Math.floor(params.startRow / PAGE_SIZE)
      const roomId = roomIdFilterRef.current
      const name = nameFilterRef.current
      const filterModel = params.filterModel as Record<string, { filter?: string }>
      const description = filterModel?.description?.filter || undefined
      const sort = params.sortModel[0]
        ? `${params.sortModel[0].colId},${params.sortModel[0].sort}`
        : 'name,asc'

      fetchLocations({ page, size: PAGE_SIZE, sort, name, roomId, description })
        .then(data => {
          params.successCallback(data.content, data.page.totalElements)
        })
        .catch(() => params.failCallback())
    },
  }), [])

  // ── Room options for filter dropdown ─────────────────────────────────────
  const roomOptions = useMemo(
    () => allRooms.map(r => ({ value: r.id, label: r.name })),
    [allRooms]
  )

  // ── Location options for filter dropdown (cascaded by room) ──────────────
  const locationOptions = useMemo(() => {
    const filtered = selectedRoomId
      ? allLocations.filter(l => l.room.id === selectedRoomId)
      : allLocations
    return filtered.map(l => ({ value: l.name, label: l.name }))
  }, [allLocations, selectedRoomId])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRoomFilterChange = useCallback((value: string | null) => {
    roomIdFilterRef.current = value ?? undefined
    setSelectedRoomId(value)
    gridRef.current?.api?.purgeInfiniteCache()
  }, [])

  const handleNameFilterChange = useCallback((value: string | null) => {
    nameFilterRef.current = value ?? undefined
    gridRef.current?.api?.purgeInfiniteCache()
  }, [])

  const handleDeleteRoom = useCallback(async (id: string) => {
    await deleteRoom(id)
    incrementRefreshTrigger()
  }, [incrementRefreshTrigger])

  const handleDeleteLocation = useCallback(async (id: string) => {
    await deleteLocation(id)
    incrementRefreshTrigger()
  }, [incrementRefreshTrigger])

  // ── Column definitions ────────────────────────────────────────────────────
  const colDefs = useMemo<ColDef<LocationResponse>[]>(() => {
    const actionCol: ColDef<LocationResponse> = {
      headerName: '',
      field: 'id',
      width: 100,
      sortable: false,
      filter: false,
      cellRenderer: ActionCell,
      cellRendererParams: {
        isAdmin,
        onDelete: handleDeleteLocation,
        deleteLabel: t('locations.grid.deleteLocation'),
        editLabel: t('locations.grid.editLocation'),
      },
    }

    return [
      {
        field: 'name',
        headerName: t('locations.grid.colName'),
        floatingFilter: true,
        filter: PassthroughFilter,
        floatingFilterComponent: SelectFloatingFilter,
        floatingFilterComponentParams: {
          options: locationOptions,
          allLabel: t('locations.grid.filterAllLocations'),
          onValueChange: handleNameFilterChange,
        },
      },
      {
        field: 'description',
        headerName: t('locations.grid.colDescription'),
        sortable: false,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        floatingFilterComponent: ClearableTextFloatingFilter,
        filterParams: { filterOptions: ['contains'], defaultOption: 'contains' },
      },
      {
        field: 'room.name',
        headerName: t('locations.grid.colRoom'),
        floatingFilter: true,
        filter: PassthroughFilter,
        floatingFilterComponent: SelectFloatingFilter,
        floatingFilterComponentParams: {
          options: roomOptions,
          allLabel: t('locations.grid.filterAllRooms'),
          onValueChange: handleRoomFilterChange,
        },
      },
      {
        field: 'bookCount',
        headerName: t('locations.grid.colBookCount'),
        width: 100,
        filter: false,
        sortable: false,
      },
      ...(isAdmin ? [actionCol] : []),
    ]
  }, [isAdmin, roomOptions, locationOptions, t, handleDeleteLocation, handleNameFilterChange, handleRoomFilterChange])

  const gridTheme = useMemo(
    () => themeQuartz.withPart(theme === 'dark' ? colorSchemeDark : colorSchemeLight),
    [theme]
  )

  const gridLocaleText = useMemo(() => {
      const isHungarian = i18n.language?.startsWith('hu');
      return isHungarian ? AG_GRID_LOCALE_HU : {};
  }, [i18n.language]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">{t('locations.pageTitle')}</h1>

      {/* ── Rooms panel ── */}
      <Collapsible open={panelOpen} onOpenChange={setPanelOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer items-center justify-between rounded-t-md border bg-card px-4 py-2 hover:opacity-70">
            <span className="flex items-center gap-2 text-sm font-medium text-card-foreground">
              {panelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {t('locations.rooms.panelTitle')}
            </span>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={e => e.stopPropagation()}>
                <Plus className="h-4 w-4 mr-1" />
                {t('locations.rooms.newRoom')}
              </Button>
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="rounded-b-md border border-t-0 bg-card divide-y">
            {allRooms.map(room => (
              <div key={room.id} className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-card-foreground">{room.name}</span>
                  <Badge variant="secondary">{room.locationCount} {t('locations.rooms.locationCount')}</Badge>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('locations.rooms.editRoom')}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={t('locations.rooms.addLocation')}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    {room.locationCount === 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        aria-label={t('locations.rooms.deleteRoom')}
                        onClick={() => handleDeleteRoom(room.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ── Locations grid ── */}
      <div className="w-full" style={{ height: 500 }}>
        <AgGridReact<LocationResponse>
          theme={gridTheme}
          ref={gridRef}
          rowModelType="infinite"
          datasource={datasource}
          columnDefs={colDefs}
          defaultColDef={{ sortable: true, resizable: true, filter: false, sortingOrder: ['asc', 'desc', null], suppressFloatingFilterButton: true, suppressHeaderFilterButton: true }}
          cacheBlockSize={PAGE_SIZE}
          maxBlocksInCache={10}
          pagination={true}
          paginationPageSize={PAGE_SIZE}
          paginationPageSizeSelector={[5, 10, 20]}
          localeText={gridLocaleText}
        />
      </div>
    </div>
  )
}
