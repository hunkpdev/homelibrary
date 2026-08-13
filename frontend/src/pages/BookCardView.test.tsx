import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { useBookStore } from '@/store/bookStore'
import type { BookResponse } from '@/api/types'
import { EMPTY_BOOK_FILTERS } from '@/components/books/BookFiltersSheet'
import { BookCardView } from './BookCardView'

const mock = new MockAdapter(axiosInstance)

class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

const book1: BookResponse = {
  id: 'book-1', title: 'Book One', isbn: null, subtitle: null, authors: ['Author A'],
  publisher: null, publishYear: 2020, pageCount: null, language: null, categories: [],
  description: null, coverImageUrl: null, status: 'AT_HOME',
  location: { id: 'loc-1', name: 'Felső polc', room: { id: 'room-1', name: 'Nappali' } },
  source: 'MANUAL', version: 0, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
}
const book2: BookResponse = { ...book1, id: 'book-2', title: 'Book Two' }

function renderCardView(props: Partial<Parameters<typeof BookCardView>[0]> = {}) {
  const onSearchChange = vi.fn()
  const onSortChange = vi.fn()
  const onFiltersChange = vi.fn()
  render(
    <BookCardView
      search=""
      onSearchChange={onSearchChange}
      sort="title,asc"
      onSortChange={onSortChange}
      filters={EMPTY_BOOK_FILTERS}
      onFiltersChange={onFiltersChange}
      {...props}
    />
  )
  return { onSearchChange, onSortChange, onFiltersChange }
}

beforeEach(() => {
  mock.reset()
  mock.onGet('/api/locations/all').reply(200, [])
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  useBookStore.setState({ booksRefreshTrigger: 0 })
  useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: null, isInitialized: true })
})

describe('BookCardView — data & rendering', () => {
  it('fetches and renders books as cards, with the results count', async () => {
    mock.onGet('/api/books').reply(200, { content: [book1, book2], page: { totalElements: 2, totalPages: 1, size: 20, number: 0 } })
    renderCardView()

    expect(await screen.findByText('Book One')).toBeInTheDocument()
    expect(screen.getByText('Book Two')).toBeInTheDocument()
    expect(screen.getByText('2 találat')).toBeInTheDocument()
  })

  it('shows the error message and retry button, without a misleading results count, when the initial load fails', async () => {
    mock.onGet('/api/books').reply(500)
    renderCardView()

    expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Újrapróbálom' })).toBeInTheDocument()
    expect(screen.queryByText(/találat/)).not.toBeInTheDocument()
  })

  it('tapping a card opens the BookDetailPanel', async () => {
    mock.onGet('/api/books').reply(200, { content: [book1], page: { totalElements: 1, totalPages: 1, size: 20, number: 0 } })
    renderCardView()

    await userEvent.click(await screen.findByTestId('book-card'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('BookCardView — filters sheet "Törlés"', () => {
  it('clears both the search and the sheet filters, and refetches without any filter params', async () => {
    mock.onGet('/api/books').reply(200, { content: [], page: { totalElements: 0, totalPages: 0, size: 20, number: 0 } })
    const { onSearchChange, onFiltersChange } = renderCardView({
      search: 'harry',
      filters: { ...EMPTY_BOOK_FILTERS, isbn: '123' },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Szűrők' }))
    await userEvent.click(screen.getByRole('button', { name: 'Törlés' }))

    expect(onSearchChange).toHaveBeenCalledWith('')
    expect(onFiltersChange).toHaveBeenCalledWith(EMPTY_BOOK_FILTERS)
  })
})

describe('BookCardView — empty state message', () => {
  it('shows a neutral empty message when there is no search or filter active', async () => {
    mock.onGet('/api/books').reply(200, { content: [], page: { totalElements: 0, totalPages: 0, size: 20, number: 0 } })
    renderCardView()
    expect(await screen.findByText('Még nincs egyetlen könyv sem')).toBeInTheDocument()
  })

  it('shows the "try a different filter" message when a search is active', async () => {
    mock.onGet('/api/books').reply(200, { content: [], page: { totalElements: 0, totalPages: 0, size: 20, number: 0 } })
    renderCardView({ search: 'harry' })
    expect(await screen.findByText('Nincs találat — próbálj más szűrőt')).toBeInTheDocument()
  })

  it('shows the "try a different filter" message when a sheet filter is active', async () => {
    mock.onGet('/api/books').reply(200, { content: [], page: { totalElements: 0, totalPages: 0, size: 20, number: 0 } })
    renderCardView({ filters: { ...EMPTY_BOOK_FILTERS, isbn: '123' } })
    expect(await screen.findByText('Nincs találat — próbálj más szűrőt')).toBeInTheDocument()
  })
})

describe('BookCardView — "+ Új könyv" FAB', () => {
  it('shows the FAB for ADMIN and opens the add modal', async () => {
    mock.onGet('/api/books').reply(200, { content: [], page: { totalElements: 0, totalPages: 0, size: 20, number: 0 } })
    renderCardView()

    const fab = await screen.findByRole('button', { name: 'Új könyv' })
    await userEvent.click(fab)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('hides the FAB for VISITOR', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: null, isInitialized: true })
    mock.onGet('/api/books').reply(200, { content: [], page: { totalElements: 0, totalPages: 0, size: 20, number: 0 } })
    renderCardView()

    await waitFor(() => expect(mock.history.get.length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: 'Új könyv' })).not.toBeInTheDocument()
  })

  it('is not disabled for DEMO — it only opens the add dialog, the actual save is gated inside it', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'demo', role: 'DEMO' }, accessToken: null, isInitialized: true })
    mock.onGet('/api/books').reply(200, { content: [], page: { totalElements: 0, totalPages: 0, size: 20, number: 0 } })
    renderCardView()

    const fab = await screen.findByRole('button', { name: 'Új könyv' })
    expect(fab).toBeEnabled()
    await userEvent.click(fab)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('BookCardView — mutation refresh strategy', () => {
  it('replaces the edited card in place after a successful edit, without refetching the list', async () => {
    mock.onGet('/api/books').reply(200, { content: [book1, book2], page: { totalElements: 2, totalPages: 1, size: 20, number: 0 } })
    mock.onPut('/api/books/book-1').reply(200, { ...book1, title: 'Book One Updated', version: 1 })
    renderCardView()
    await screen.findByText('Book One')

    const card1 = screen.getByText('Book One').closest('[data-testid="book-card"]') as HTMLElement
    await userEvent.click(within(card1).getByRole('button', { name: 'Szerkesztés' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    await waitFor(() => expect(screen.queryByText('Book One')).not.toBeInTheDocument())
    expect(screen.getAllByText('Book One Updated').length).toBeGreaterThan(0)
    expect(screen.getByText('Book Two')).toBeInTheDocument()
    expect(screen.getAllByTestId('book-card')).toHaveLength(2)
    expect(mock.history.get.filter(r => r.url === '/api/books')).toHaveLength(1)
  })

  it('removes the deleted card from the list, without refetching', async () => {
    mock.onGet('/api/books').reply(200, { content: [book1, book2], page: { totalElements: 2, totalPages: 1, size: 20, number: 0 } })
    mock.onDelete('/api/books/book-1').reply(204)
    renderCardView()
    await screen.findByText('Book One')

    const card1 = screen.getByText('Book One').closest('[data-testid="book-card"]') as HTMLElement
    await userEvent.click(within(card1).getByRole('button', { name: 'Törlés' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Törlés' }))

    await waitFor(() => expect(screen.queryByText('Book One')).not.toBeInTheDocument())
    expect(screen.getByText('Book Two')).toBeInTheDocument()
    expect(screen.getAllByTestId('book-card')).toHaveLength(1)
    expect(mock.history.get.filter(r => r.url === '/api/books')).toHaveLength(1)
  })
})
