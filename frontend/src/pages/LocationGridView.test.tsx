import { forwardRef, useImperativeHandle } from 'react'
import type { Ref } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import type { LocationResponse, RoomResponse } from '@/api/types'
import { EMPTY_LOCATION_FILTERS } from '@/components/locations/LocationFiltersSheet'
import LocationGridView from './LocationGridView'
import type { LocationGridViewFilterState } from './LocationGridView'

const mock = new MockAdapter(axiosInstance)

const makeToken = (role: 'ADMIN' | 'VISITOR' | 'DEMO') =>
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-1', username: 'user', role }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
  '.signature'

const room: RoomResponse = { id: 'room-1', name: 'Nappali', description: null, locationCount: 1, version: 0 }
const rooms: RoomResponse[] = [room]

const location: LocationResponse = {
  id: 'loc-1', name: 'Felső polc', description: null, room: { id: 'room-1', name: 'Nappali' }, bookCount: 0, version: 0,
}

const { mockGridApi } = vi.hoisted(() => ({
  mockGridApi: {
    setFilterModel: vi.fn(),
    applyColumnState: vi.fn(),
    getFilterModel: vi.fn((): Record<string, { filter?: string } | undefined> => ({})),
    getColumnState: vi.fn((): { colId: string; sort?: 'asc' | 'desc' | null }[] => []),
    purgeInfiniteCache: vi.fn(),
  },
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedGridProps: Record<string, any> = {}

vi.mock('ag-grid-react', () => ({
  AgGridReact: forwardRef((props: Record<string, unknown>, ref: Ref<unknown>) => {
    capturedGridProps = props
    useImperativeHandle(ref, () => ({ api: mockGridApi }))
    return <div data-testid="ag-grid" />
  }),
}))

const defaultFilterState: LocationGridViewFilterState = { search: '', sort: 'name,asc', filters: EMPTY_LOCATION_FILTERS }

function renderGrid(props: Partial<{ initialFilterState: LocationGridViewFilterState; onFilterStateCapture: (s: LocationGridViewFilterState) => void; rooms: RoomResponse[] }> = {}) {
  const onFilterStateCapture = props.onFilterStateCapture ?? vi.fn()
  const result = render(
    <LocationGridView
      initialFilterState={props.initialFilterState ?? defaultFilterState}
      onFilterStateCapture={onFilterStateCapture}
      rooms={props.rooms ?? rooms}
    />
  )
  return { ...result, onFilterStateCapture }
}

beforeEach(() => {
  mock.reset()
  mock.onGet('/api/locations/all').reply(200, [location])
  capturedGridProps = {}
  mockGridApi.setFilterModel.mockClear()
  mockGridApi.applyColumnState.mockClear()
  mockGridApi.purgeInfiniteCache.mockClear()
  mockGridApi.getFilterModel.mockReset().mockReturnValue({})
  mockGridApi.getColumnState.mockReset().mockReturnValue([])
  useLocationStore.setState({ locationsRefreshTrigger: 0 })
})

describe('LocationGridView — render', () => {
  it('renders AG Grid', () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderGrid()
    expect(screen.getByTestId('ag-grid')).toBeInTheDocument()
  })

  it('fetches all locations from the API on mount, for the name column dropdown', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderGrid()
    await waitFor(() => expect(mock.history.get.some(r => r.url === '/api/locations/all')).toBe(true))
  })

  it('VISITOR sees no action column (no edit/delete cell renderer params)', () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderGrid()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionCol = (capturedGridProps.columnDefs as any[])?.find(c => c.cellRenderer)
    expect(actionCol).toBeUndefined()
  })
})

describe('LocationGridView — datasource', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
  })

  it('getRows calls successCallback with fetched data', async () => {
    mock.onGet('/api/locations').reply(200, {
      content: [location],
      page: { totalElements: 1, totalPages: 1, size: 10, number: 0 },
    })
    renderGrid()
    const successCallback = vi.fn()
    const failCallback = vi.fn()
    capturedGridProps.datasource.getRows({ startRow: 0, filterModel: {}, sortModel: [], successCallback, failCallback })
    await waitFor(() => expect(successCallback).toHaveBeenCalledWith([location], 1))
  })

  it('getRows calls failCallback on API error', async () => {
    mock.onGet('/api/locations').reply(500)
    renderGrid()
    const successCallback = vi.fn()
    const failCallback = vi.fn()
    capturedGridProps.datasource.getRows({ startRow: 0, filterModel: {}, sortModel: [], successCallback, failCallback })
    await waitFor(() => expect(failCallback).toHaveBeenCalled())
  })
})

describe('LocationGridView — location edit/delete modals', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
  })

  it('action cell onEdit opens the edit LocationFormModal', () => {
    renderGrid()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionCol = (capturedGridProps.columnDefs as any[]).find(c => c.cellRendererParams)
    act(() => actionCol.cellRendererParams.onEdit(location))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('action cell onDelete opens the DeleteModal', () => {
    renderGrid()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionCol = (capturedGridProps.columnDefs as any[]).find(c => c.cellRendererParams)
    act(() => actionCol.cellRendererParams.onDelete(location))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('successful location delete increments the shared refresh trigger', async () => {
    mock.onDelete('/api/locations/loc-1').reply(204)
    renderGrid()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionCol = (capturedGridProps.columnDefs as any[]).find(c => c.cellRendererParams)
    act(() => actionCol.cellRendererParams.onDelete(location))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Törlés' }))
    await waitFor(() => expect(useLocationStore.getState().locationsRefreshTrigger).toBe(1))
  })
})

describe('LocationGridView — filter/sort state handoff (option C: snapshot sync)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
  })

  it('seeds description filter model, sort and forces a refetch (purgeInfiniteCache) on grid ready', async () => {
    const initialFilterState: LocationGridViewFilterState = {
      search: 'polc',
      sort: 'room.name,desc',
      filters: { roomId: 'room-1', description: 'alsó' },
    }
    renderGrid({ initialFilterState })

    act(() => capturedGridProps.onGridReady({ api: mockGridApi }))
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockGridApi.setFilterModel).toHaveBeenCalledWith({
      description: { filterType: 'text', type: 'contains', filter: 'alsó' },
    })
    expect(mockGridApi.applyColumnState).toHaveBeenCalledWith({
      state: [{ colId: 'room.name', sort: 'desc' }],
      defaultState: { sort: null },
    })
    expect(mockGridApi.purgeInfiniteCache).toHaveBeenCalled()
  })

  it('seeds each floating filter\'s displayed value directly from initialFilterState', () => {
    const initialFilterState: LocationGridViewFilterState = {
      search: 'polc',
      sort: 'name,asc',
      filters: { roomId: 'room-1', description: 'alsó' },
    }
    renderGrid({ initialFilterState })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colDefs = capturedGridProps.columnDefs as any[]
    const byField = (field: string) => colDefs.find(c => c.field === field)

    expect(byField('name').floatingFilterComponentParams.initialValue).toBe('polc')
    expect(byField('description').floatingFilterComponentParams.initialValue).toBe('alsó')
    expect(byField('room.name').floatingFilterComponentParams.initialValue).toBe('room-1')
  })

  it('captures the last known state (name/room refs + description filter model + sort) on unmount', () => {
    const onFilterStateCapture = vi.fn()
    const { unmount } = renderGrid({ onFilterStateCapture })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colDefs = capturedGridProps.columnDefs as any[]
    const nameCol = colDefs.find(c => c.field === 'name')
    const roomCol = colDefs.find(c => c.field === 'room.name')

    act(() => nameCol.floatingFilterComponentParams.onValueChange('polc'))
    act(() => roomCol.floatingFilterComponentParams.onValueChange('room-1'))

    mockGridApi.getFilterModel.mockReturnValue({ description: { filter: 'alsó' } })
    mockGridApi.getColumnState.mockReturnValue([{ colId: 'room.name', sort: 'desc' }])
    act(() => capturedGridProps.onFilterChanged())

    unmount()

    expect(onFilterStateCapture).toHaveBeenCalledWith({
      search: 'polc',
      sort: 'room.name,desc',
      filters: { roomId: 'room-1', description: 'alsó' },
    })
  })
})
