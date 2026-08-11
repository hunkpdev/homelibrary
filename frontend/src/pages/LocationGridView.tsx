import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, IDatasource, IGetRowsParams } from 'ag-grid-community'
import { AllCommunityModule, colorSchemeDark, colorSchemeLight, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { AG_GRID_LOCALE_HU } from '@ag-grid-community/locale'
import { deleteLocation, fetchAllLocations, fetchLocations } from '@/api/locationApi'
import type { LocationResponse, RoomResponse } from '@/api/types'
import { useLocationStore } from '@/store/locationStore'
import { useAuthStore } from '@/store/authStore'
import { useTheme } from '@/hooks/useTheme'
import { useGridFilterSortHandoff } from '@/hooks/useGridFilterSortHandoff'
import { PassthroughFilter } from '@/components/grid/PassthroughFilter'
import { SelectFloatingFilter } from '@/components/grid/SelectFloatingFilter'
import { ClearableTextFloatingFilter } from '@/components/grid/ClearableTextFloatingFilter'
import { ActionCell } from '@/components/locations/ActionCell'
import { LocationFormModal } from '@/components/locations/LocationFormModal'
import { DeleteModal } from '@/components/ui/DeleteModal'
import type { LocationFiltersValues } from '@/components/locations/LocationFiltersSheet'

ModuleRegistry.registerModules([AllCommunityModule])

const PAGE_SIZE = 10

export interface LocationGridViewFilterState {
  search: string
  sort: string
  filters: LocationFiltersValues
}

export interface LocationGridViewProps {
  initialFilterState: LocationGridViewFilterState
  onFilterStateCapture: (state: LocationGridViewFilterState) => void
  rooms: RoomResponse[]
}

function textFilterModel(value: string) {
  return { filterType: 'text', type: 'contains', filter: value }
}

export default function LocationGridView({ initialFilterState, onFilterStateCapture, rooms }: Readonly<LocationGridViewProps>) {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()
  const isAdmin = useAuthStore(s => s.user?.role === 'ADMIN')
  const isDemo = useAuthStore(s => s.user?.role === 'DEMO')
  const { locationsRefreshTrigger, incrementRefreshTrigger } = useLocationStore()

  const nameFilterRef = useRef<string | undefined>(initialFilterState.search || undefined)
  const roomIdFilterRef = useRef<string | undefined>(initialFilterState.filters.roomId || undefined)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialFilterState.filters.roomId || null)
  const [allLocations, setAllLocations] = useState<LocationResponse[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editingLocation, setEditingLocation] = useState<LocationResponse | undefined>(undefined)
  const [locationFormOpen, setLocationFormOpen] = useState(false)
  const [deleteLocationTarget, setDeleteLocationTarget] = useState<LocationResponse | undefined>(undefined)

  const initialFilterStateRef = useRef(initialFilterState)

  const { gridRef, onGridReady, onFilterChanged, onSortChanged } = useGridFilterSortHandoff<LocationResponse, LocationGridViewFilterState>({
    initialState: initialFilterState,
    onStateCapture: onFilterStateCapture,
    seed: api => {
      const { search, sort, filters } = initialFilterStateRef.current
      nameFilterRef.current = search || undefined
      roomIdFilterRef.current = filters.roomId || undefined
      setSelectedRoomId(filters.roomId || null)

      const filterModel: Record<string, ReturnType<typeof textFilterModel>> = {}
      if (filters.description) filterModel.description = textFilterModel(filters.description)
      api.setFilterModel(filterModel)

      const [sortField, sortDir] = sort.split(',')
      api.applyColumnState({
        state: [{ colId: sortField, sort: sortDir === 'desc' ? 'desc' : 'asc' }],
        defaultState: { sort: null },
      })

      // name/roomId live outside AG Grid's own filter model (PassthroughFilter) — setFilterModel/
      // applyColumnState above won't necessarily trigger a refetch on their own if description/sort
      // happen to already match their defaults, so force one explicitly.
      api.purgeInfiniteCache()
    },
    capture: api => {
      const filterModel = api.getFilterModel() as Record<string, { filter?: string } | undefined>
      const sortedColumn = api.getColumnState().find(c => c.sort)
      return {
        search: nameFilterRef.current ?? '',
        sort: sortedColumn ? `${sortedColumn.colId},${sortedColumn.sort}` : 'name,asc',
        filters: {
          roomId: roomIdFilterRef.current ?? '',
          description: filterModel.description?.filter ?? '',
        },
      }
    },
  })

  // Only the grid needs the full location list, to populate the name column's cascaded dropdown.
  useEffect(() => {
    setLoadError(null)
    fetchAllLocations()
      .then(setAllLocations)
      .catch(() => setLoadError(t('common.errorUnexpected')))
  }, [locationsRefreshTrigger, t])

  useEffect(() => {
    if (locationsRefreshTrigger > 0) {
      gridRef.current?.api?.purgeInfiniteCache()
    }
  }, [locationsRefreshTrigger, gridRef])

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
        .then(data => params.successCallback(data.content, data.page.totalElements))
        .catch(() => params.failCallback())
    },
  }), [])

  const roomOptions = useMemo(() => rooms.map(r => ({ value: r.id, label: r.name })), [rooms])

  const locationOptions = useMemo(() => {
    const filtered = selectedRoomId ? allLocations.filter(l => l.room.id === selectedRoomId) : allLocations
    return filtered.map(l => ({ value: l.name, label: l.name }))
  }, [allLocations, selectedRoomId])

  const handleRoomFilterChange = useCallback((value: string | null) => {
    roomIdFilterRef.current = value ?? undefined
    setSelectedRoomId(value)
    gridRef.current?.api?.purgeInfiniteCache()
    onFilterChanged()
  }, [gridRef, onFilterChanged])

  const handleNameFilterChange = useCallback((value: string | null) => {
    nameFilterRef.current = value ?? undefined
    gridRef.current?.api?.purgeInfiniteCache()
    onFilterChanged()
  }, [gridRef, onFilterChanged])

  const handleOpenEditLocation = useCallback((location: LocationResponse) => {
    setEditingLocation(location)
    setLocationFormOpen(true)
  }, [])

  const handleOpenDeleteLocation = useCallback((location: LocationResponse) => {
    setDeleteLocationTarget(location)
  }, [])

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
        isDemo,
        onEdit: handleOpenEditLocation,
        onDelete: handleOpenDeleteLocation,
        deleteLabel: t('common.delete'),
        editLabel: t('common.edit'),
      },
    }

    return [
      {
        field: 'name',
        headerName: t('locations.grid.colName'),
        minWidth: 150,
        wrapText: true,
        floatingFilter: true,
        filter: PassthroughFilter,
        floatingFilterComponent: SelectFloatingFilter,
        floatingFilterComponentParams: {
          options: locationOptions,
          allLabel: t('locations.grid.filterAllLocations'),
          onValueChange: handleNameFilterChange,
          initialValue: initialFilterStateRef.current.search || undefined,
        },
      },
      {
        field: 'description',
        headerName: t('locations.grid.colDescription'),
        minWidth: 200,
        wrapText: true,
        sortable: false,
        filter: 'agTextColumnFilter',
        floatingFilter: true,
        floatingFilterComponent: ClearableTextFloatingFilter,
        floatingFilterComponentParams: { initialValue: initialFilterStateRef.current.filters.description },
        filterParams: { filterOptions: ['contains'], defaultOption: 'contains' },
      },
      {
        field: 'room.name',
        headerName: t('locations.grid.colRoom'),
        minWidth: 150,
        floatingFilter: true,
        filter: PassthroughFilter,
        floatingFilterComponent: SelectFloatingFilter,
        floatingFilterComponentParams: {
          options: roomOptions,
          allLabel: t('locations.grid.filterAllRooms'),
          onValueChange: handleRoomFilterChange,
          initialValue: initialFilterStateRef.current.filters.roomId || undefined,
        },
      },
      {
        field: 'bookCount',
        headerName: t('locations.grid.colBookCount'),
        width: 100,
        minWidth: 80,
        filter: false,
        sortable: false,
      },
      ...(isAdmin || isDemo ? [actionCol] : []),
    ]
  }, [isAdmin, isDemo, roomOptions, locationOptions, t, handleOpenEditLocation, handleOpenDeleteLocation, handleNameFilterChange, handleRoomFilterChange])

  const gridTheme = useMemo(
    () => themeQuartz.withPart(theme === 'dark' ? colorSchemeDark : colorSchemeLight),
    [theme]
  )

  const gridLocaleText = useMemo(() => {
    const isHungarian = i18n.language?.startsWith('hu')
    return isHungarian ? AG_GRID_LOCALE_HU : {}
  }, [i18n.language])

  return (
    <div className="flex flex-col gap-2">
      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      <div className="w-full" style={{ height: 500 }}>
        <AgGridReact<LocationResponse>
          theme={gridTheme}
          ref={gridRef}
          rowModelType="infinite"
          datasource={datasource}
          columnDefs={colDefs}
          suppressDragLeaveHidesColumns={true}
          defaultColDef={{
            sortable: true,
            resizable: true,
            filter: false,
            sortingOrder: ['asc', 'desc', null],
            suppressFloatingFilterButton: true,
            suppressHeaderFilterButton: true,
          }}
          cacheBlockSize={PAGE_SIZE}
          maxBlocksInCache={10}
          pagination={true}
          paginationPageSize={PAGE_SIZE}
          paginationPageSizeSelector={[5, 10, 20]}
          localeText={gridLocaleText}
          onGridReady={onGridReady}
          onFilterChanged={onFilterChanged}
          onSortChanged={onSortChanged}
        />
      </div>

      <LocationFormModal
        open={locationFormOpen}
        onClose={() => setLocationFormOpen(false)}
        onSuccess={incrementRefreshTrigger}
        location={editingLocation}
        rooms={rooms}
      />
      <DeleteModal
        open={deleteLocationTarget !== undefined}
        onClose={() => setDeleteLocationTarget(undefined)}
        onSuccess={incrementRefreshTrigger}
        onDelete={() => deleteLocation(deleteLocationTarget!.id)}
        title={t('locations.delete.title')}
        description={t('locations.delete.confirm', { name: deleteLocationTarget?.name ?? '' })}
        errorConflictMessage={t('locations.delete.errorConflict')}
      />
    </div>
  )
}
