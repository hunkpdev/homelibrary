import { forwardRef, useImperativeHandle } from 'react'
import type { Ref } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { useBookStore } from '@/store/bookStore'
import type { BookResponse } from '@/api/types'
import { EMPTY_BOOK_FILTERS } from '@/components/books/BookFiltersSheet'
import BookGridView from './BookGridView'
import type { BookGridViewFilterState } from './BookGridView'

const mock = new MockAdapter(axiosInstance)

const makeToken = (role: 'ADMIN' | 'VISITOR' | 'DEMO') =>
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-1', username: 'user', role }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
  '.signature'

const book: BookResponse = {
  id: 'book-1', title: 'Title 1', isbn: '978-0-06-112008-4', subtitle: null,
  authors: ['Author 1'], publisher: null, publishYear: 2024, pageCount: null,
  language: null, categories: [], description: null, coverImageUrl: null,
  status: 'AT_HOME', location: { id: 'loc-1', name: 'Felső polc', room: { id: 'room-1', name: 'Nappali' } }, source: 'MANUAL', version: 0,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
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

const defaultFilterState: BookGridViewFilterState = { search: '', sort: 'title,asc', filters: EMPTY_BOOK_FILTERS }

function renderGrid(props: Partial<{ initialFilterState: BookGridViewFilterState; onFilterStateCapture: (s: BookGridViewFilterState) => void }> = {}) {
  const onFilterStateCapture = props.onFilterStateCapture ?? vi.fn()
  const result = render(
    <BookGridView
      initialFilterState={props.initialFilterState ?? defaultFilterState}
      onFilterStateCapture={onFilterStateCapture}
    />
  )
  return { ...result, onFilterStateCapture }
}

beforeEach(() => {
  mock.reset()
  mock.onGet('/api/locations/all').reply(200, [])
  capturedGridProps = {}
  mockGridApi.setFilterModel.mockClear()
  mockGridApi.applyColumnState.mockClear()
  mockGridApi.getFilterModel.mockReset().mockReturnValue({})
  mockGridApi.getColumnState.mockReset().mockReturnValue([])
  useBookStore.setState({ booksRefreshTrigger: 0 })
})

describe('BookGridView — render', () => {
  it('renders AG Grid', () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderGrid()
    expect(screen.getByTestId('ag-grid')).toBeInTheDocument()
  })

  it('delete modal is not visible on initial render', () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderGrid()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('BookGridView — "Új könyv" button', () => {
  it('ADMIN sees "Új könyv" button', () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderGrid()
    expect(screen.getByRole('button', { name: 'Új könyv' })).toBeInTheDocument()
  })

  it('DEMO sees "Új könyv" button', () => {
    useAuthStore.setState({ user: { id: '1', username: 'demo', role: 'DEMO' }, accessToken: makeToken('DEMO'), isInitialized: true })
    renderGrid()
    expect(screen.getByRole('button', { name: 'Új könyv' })).toBeInTheDocument()
  })

  it('VISITOR does not see "Új könyv" button', () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderGrid()
    expect(screen.queryByRole('button', { name: 'Új könyv' })).not.toBeInTheDocument()
  })

  it('clicking "Új könyv" opens BookFormModal', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderGrid()
    await userEvent.click(screen.getByRole('button', { name: 'Új könyv' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closing add modal hides dialog', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderGrid()
    await userEvent.click(screen.getByRole('button', { name: 'Új könyv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mégse' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('BookGridView — grid interactions', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
  })

  it('onCellClicked (non-actions column) opens BookDetailPanel', () => {
    renderGrid()
    act(() => capturedGridProps.onCellClicked({
      column: { getColId: () => 'title' },
      data: book,
    }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('onCellClicked on actions column does not open BookDetailPanel', () => {
    renderGrid()
    act(() => capturedGridProps.onCellClicked({
      column: { getColId: () => 'actions' },
      data: book,
    }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('action cell onEdit opens edit BookFormModal', () => {
    renderGrid()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionCol = capturedGridProps.columnDefs?.find((c: any) => c.colId === 'actions')
    act(() => actionCol.cellRendererParams.onEdit(book))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('action cell onDelete opens BookDeleteConfirmModal', () => {
    renderGrid()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionCol = capturedGridProps.columnDefs?.find((c: any) => c.colId === 'actions')
    act(() => actionCol.cellRendererParams.onDelete(book))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('handleEditSuccess increments refresh trigger', async () => {
    mock.onPut('/api/books/book-1').reply(200, { ...book, version: 1 })
    renderGrid()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionCol = capturedGridProps.columnDefs?.find((c: any) => c.colId === 'actions')
    act(() => actionCol.cellRendererParams.onEdit(book))
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))
    await waitFor(() => expect(useBookStore.getState().booksRefreshTrigger).toBe(1))
  })

  it('handleDeleteSuccess increments refresh trigger', async () => {
    mock.onDelete('/api/books/book-1').reply(204)
    renderGrid()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionCol = capturedGridProps.columnDefs?.find((c: any) => c.colId === 'actions')
    act(() => actionCol.cellRendererParams.onDelete(book))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Törlés' }))
    await waitFor(() => expect(useBookStore.getState().booksRefreshTrigger).toBe(1))
  })
})

describe('BookGridView — datasource', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
  })

  it('getRows calls successCallback with fetched data', async () => {
    mock.onGet('/api/books').reply(200, {
      content: [book],
      page: { totalElements: 1, totalPages: 1, size: 10, number: 0 },
    })
    renderGrid()
    const successCallback = vi.fn()
    const failCallback = vi.fn()
    capturedGridProps.datasource.getRows({
      startRow: 0, filterModel: {}, sortModel: [], successCallback, failCallback,
    })
    await waitFor(() => expect(successCallback).toHaveBeenCalledWith([book], 1))
  })

  it('getRows calls failCallback on API error', async () => {
    mock.onGet('/api/books').reply(500)
    renderGrid()
    const successCallback = vi.fn()
    const failCallback = vi.fn()
    capturedGridProps.datasource.getRows({
      startRow: 0, filterModel: {}, sortModel: [], successCallback, failCallback,
    })
    await waitFor(() => expect(failCallback).toHaveBeenCalled())
  })
})

describe('BookGridView — filter/sort state handoff (option C: snapshot sync)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
  })

  it('seeds the grid filter model and sort from initialFilterState on grid ready', async () => {
    const initialFilterState: BookGridViewFilterState = {
      search: 'harry',
      sort: 'authors,desc',
      filters: { isbn: '123', authors: 'Rowling', category: 'Fantasy', publishYear: '199' },
    }
    renderGrid({ initialFilterState })

    // The seeding is deferred by one tick (setTimeout(0)) to avoid a floating-filter-row layout
    // glitch when a non-empty filter model is applied in the grid's very first layout pass.
    act(() => capturedGridProps.onGridReady({ api: mockGridApi }))
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockGridApi.setFilterModel).toHaveBeenCalledWith({
      title: { filterType: 'text', type: 'contains', filter: 'harry' },
      isbn: { filterType: 'text', type: 'contains', filter: '123' },
      authors: { filterType: 'text', type: 'contains', filter: 'Rowling' },
      categories: { filterType: 'text', type: 'contains', filter: 'Fantasy' },
      publishYear: { filterType: 'text', type: 'contains', filter: '199' },
    })
    expect(mockGridApi.applyColumnState).toHaveBeenCalledWith({
      state: [{ colId: 'authors', sort: 'desc' }],
      defaultState: { sort: null },
    })
  })

  it('seeds each floating filter\'s displayed value directly from initialFilterState (not relying on the grid\'s onParentModelChanged notification)', () => {
    const initialFilterState: BookGridViewFilterState = {
      search: 'harry',
      sort: 'title,asc',
      filters: { isbn: '123', authors: 'Rowling', category: 'Fantasy', publishYear: '199' },
    }
    renderGrid({ initialFilterState })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colDefs = capturedGridProps.columnDefs as any[]
    const byField = (field: string) => colDefs.find(c => c.field === field)

    expect(byField('title').floatingFilterComponentParams).toEqual({ initialValue: 'harry' })
    expect(byField('isbn').floatingFilterComponentParams).toEqual({ initialValue: '123' })
    expect(byField('authors').floatingFilterComponentParams).toEqual({ initialValue: 'Rowling' })
    expect(byField('categories').floatingFilterComponentParams).toEqual({ initialValue: 'Fantasy' })
    expect(byField('publishYear').floatingFilterComponentParams).toEqual({ initialValue: '199' })
  })

  it('seeds an empty filter model and default title,asc sort when there is no prior filter state', async () => {
    renderGrid({ initialFilterState: defaultFilterState })

    act(() => capturedGridProps.onGridReady({ api: mockGridApi }))
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(mockGridApi.setFilterModel).toHaveBeenCalledWith({})
    expect(mockGridApi.applyColumnState).toHaveBeenCalledWith({
      state: [{ colId: 'title', sort: 'asc' }],
      defaultState: { sort: null },
    })
  })

  it('captures the last known filter/sort state (cached on onFilterChanged/onSortChanged) when the grid unmounts', () => {
    const { unmount, onFilterStateCapture } = renderGrid()

    // Simulate the user changing a filter/sort while the grid is mounted — this is what keeps the
    // cache up to date, since gridRef.current is already null by the time unmount cleanup runs.
    mockGridApi.getFilterModel.mockReturnValue({
      title: { filter: 'harry' },
      isbn: { filter: '123' },
    })
    mockGridApi.getColumnState.mockReturnValue([
      { colId: 'actions' },
      { colId: 'authors', sort: 'desc' },
    ])
    act(() => capturedGridProps.onFilterChanged())

    unmount()

    expect(onFilterStateCapture).toHaveBeenCalledWith({
      search: 'harry',
      sort: 'authors,desc',
      filters: { isbn: '123', authors: '', category: '', publishYear: '' },
    })
  })

  it('falls back to title,asc when no column is sorted', () => {
    const { unmount, onFilterStateCapture } = renderGrid()

    mockGridApi.getFilterModel.mockReturnValue({})
    mockGridApi.getColumnState.mockReturnValue([{ colId: 'title' }])
    act(() => capturedGridProps.onSortChanged())

    unmount()

    expect(onFilterStateCapture).toHaveBeenCalledWith({
      search: '',
      sort: 'title,asc',
      filters: EMPTY_BOOK_FILTERS,
    })
  })

  it('hands back the initial filter state unchanged when the grid is unmounted without any filter/sort change', () => {
    const initialFilterState: BookGridViewFilterState = {
      search: 'harry',
      sort: 'authors,desc',
      filters: { isbn: '123', authors: '', category: '', publishYear: '' },
    }
    const { unmount, onFilterStateCapture } = renderGrid({ initialFilterState })

    unmount()

    expect(onFilterStateCapture).toHaveBeenCalledWith(initialFilterState)
  })
})
