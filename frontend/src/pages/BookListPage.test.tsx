import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { useBookStore } from '@/store/bookStore'
import { BookListPage } from './BookListPage'

const mock = new MockAdapter(axiosInstance)

const makeToken = (role: 'ADMIN' | 'VISITOR' | 'DEMO') =>
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-1', username: 'user', role }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
  '.signature'

vi.mock('ag-grid-react', () => ({
  AgGridReact: () => <div data-testid="ag-grid" />,
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
