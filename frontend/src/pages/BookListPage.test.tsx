import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { useBookStore } from '@/store/bookStore'
import type { BookResponse } from '@/api/types'
import { BookListPage } from './BookListPage'

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
  status: 'AT_HOME', location: null, source: 'MANUAL', version: 0,
  createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
}

let capturedGridProps: Record<string, any> = {}

vi.mock('ag-grid-react', () => ({
  AgGridReact: (props: any) => {
    capturedGridProps = props
    return <div data-testid="ag-grid" />
  },
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <BookListPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mock.reset()
  mock.onGet('/api/locations/all').reply(200, [])
  capturedGridProps = {}
  useBookStore.setState({ booksRefreshTrigger: 0 })
})

describe('BookListPage — render', () => {
  it('shows page title', () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('renders AG Grid', () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderPage()
    expect(screen.getByTestId('ag-grid')).toBeInTheDocument()
  })
})

describe('BookListPage — delete modal', () => {
  it('delete modal is not visible on initial render', () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('BookListPage — "Új könyv" button', () => {
  it('ADMIN sees "Új könyv" button', () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()
    expect(screen.getByRole('button', { name: 'Új könyv' })).toBeInTheDocument()
  })

  it('DEMO sees "Új könyv" button', () => {
    useAuthStore.setState({ user: { id: '1', username: 'demo', role: 'DEMO' }, accessToken: makeToken('DEMO'), isInitialized: true })
    renderPage()
    expect(screen.getByRole('button', { name: 'Új könyv' })).toBeInTheDocument()
  })

  it('VISITOR does not see "Új könyv" button', () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderPage()
    expect(screen.queryByRole('button', { name: 'Új könyv' })).not.toBeInTheDocument()
  })

  it('clicking "Új könyv" opens BookFormModal', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Új könyv' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closing add modal hides dialog', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Új könyv' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mégse' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('BookListPage — grid interactions', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
  })

  it('onCellClicked (non-actions column) opens BookDetailPanel', () => {
    renderPage()
    act(() => capturedGridProps.onCellClicked({
      column: { getColId: () => 'title' },
      data: book,
    }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('onCellClicked on actions column does not open BookDetailPanel', () => {
    renderPage()
    act(() => capturedGridProps.onCellClicked({
      column: { getColId: () => 'actions' },
      data: book,
    }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('action cell onEdit opens edit BookFormModal', () => {
    renderPage()
    const actionCol = capturedGridProps.columnDefs?.find((c: any) => c.colId === 'actions')
    act(() => actionCol.cellRendererParams.onEdit(book))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('action cell onDelete opens BookDeleteConfirmModal', () => {
    renderPage()
    const actionCol = capturedGridProps.columnDefs?.find((c: any) => c.colId === 'actions')
    act(() => actionCol.cellRendererParams.onDelete(book))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('handleEditSuccess increments refresh trigger', async () => {
    mock.onPut('/api/books/book-1').reply(200, { ...book, version: 1 })
    renderPage()
    const actionCol = capturedGridProps.columnDefs?.find((c: any) => c.colId === 'actions')
    act(() => actionCol.cellRendererParams.onEdit(book))
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))
    await waitFor(() => expect(useBookStore.getState().booksRefreshTrigger).toBe(1))
  })

  it('handleDeleteSuccess increments refresh trigger', async () => {
    mock.onDelete('/api/books/book-1').reply(204)
    renderPage()
    const actionCol = capturedGridProps.columnDefs?.find((c: any) => c.colId === 'actions')
    act(() => actionCol.cellRendererParams.onDelete(book))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Törlés' }))
    await waitFor(() => expect(useBookStore.getState().booksRefreshTrigger).toBe(1))
  })
})

describe('BookListPage — datasource', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
  })

  it('getRows calls successCallback with fetched data', async () => {
    mock.onGet('/api/books').reply(200, {
      content: [book],
      page: { totalElements: 1, totalPages: 1, size: 10, number: 0 },
    })
    renderPage()
    const successCallback = vi.fn()
    const failCallback = vi.fn()
    capturedGridProps.datasource.getRows({
      startRow: 0, filterModel: {}, sortModel: [], successCallback, failCallback,
    })
    await waitFor(() => expect(successCallback).toHaveBeenCalledWith([book], 1))
  })

  it('getRows calls failCallback on API error', async () => {
    mock.onGet('/api/books').reply(500)
    renderPage()
    const successCallback = vi.fn()
    const failCallback = vi.fn()
    capturedGridProps.datasource.getRows({
      startRow: 0, filterModel: {}, sortModel: [], successCallback, failCallback,
    })
    await waitFor(() => expect(failCallback).toHaveBeenCalled())
  })
})
