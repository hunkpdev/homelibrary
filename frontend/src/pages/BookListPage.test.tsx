import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useIsMobile } from '@/hooks/use-mobile'
import { BookListPage } from './BookListPage'
import type { BookGridViewFilterState } from './BookGridView'
import type { BookCardViewProps } from './BookCardView'

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: vi.fn() }))

vi.mock('@/pages/BookCardView', () => ({
  BookCardView: (props: BookCardViewProps) => (
    <div data-testid="book-card-view">
      <span data-testid="card-search">{props.search}</span>
      <span data-testid="card-sort">{props.sort}</span>
      <button onClick={() => props.onSearchChange('typed')}>set-search</button>
    </div>
  ),
}))

vi.mock('@/pages/BookGridView', () => ({
  default: (props: {
    initialFilterState: BookGridViewFilterState
    onFilterStateCapture: (state: BookGridViewFilterState) => void
  }) => (
    <div data-testid="book-grid-view">
      <span data-testid="grid-initial-search">{props.initialFilterState.search}</span>
      <button
        onClick={() => props.onFilterStateCapture({
          search: 'from-grid',
          sort: 'authors,desc',
          filters: { isbn: '', authors: '', category: '', publishYear: '' },
        })}
      >
        capture
      </button>
    </div>
  ),
}))

const mockUseIsMobile = vi.mocked(useIsMobile)

beforeEach(() => {
  mockUseIsMobile.mockReturnValue(false)
})

describe('BookListPage — view switching', () => {
  it('always shows the page title', () => {
    render(<BookListPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Könyvek' })).toBeInTheDocument()
  })

  it('renders the grid view when not mobile', async () => {
    mockUseIsMobile.mockReturnValue(false)
    render(<BookListPage />)
    expect(await screen.findByTestId('book-grid-view')).toBeInTheDocument()
    expect(screen.queryByTestId('book-card-view')).not.toBeInTheDocument()
  })

  it('renders the card view when mobile', async () => {
    mockUseIsMobile.mockReturnValue(true)
    render(<BookListPage />)
    expect(await screen.findByTestId('book-card-view')).toBeInTheDocument()
    expect(screen.queryByTestId('book-grid-view')).not.toBeInTheDocument()
  })
})

describe('BookListPage — filter/sort state survives a breakpoint switch', () => {
  it('state captured from the grid is handed to the card view after switching to mobile', async () => {
    mockUseIsMobile.mockReturnValue(false)
    const { rerender } = render(<BookListPage />)
    await screen.findByTestId('book-grid-view')

    await userEvent.click(screen.getByRole('button', { name: 'capture' }))

    mockUseIsMobile.mockReturnValue(true)
    rerender(<BookListPage />)

    expect(await screen.findByTestId('card-search')).toHaveTextContent('from-grid')
    expect(screen.getByTestId('card-sort')).toHaveTextContent('authors,desc')
  })

  it('state set in the card view is handed to the grid as its initial filter state after switching to desktop', async () => {
    mockUseIsMobile.mockReturnValue(true)
    const { rerender } = render(<BookListPage />)

    await userEvent.click(await screen.findByRole('button', { name: 'set-search' }))

    mockUseIsMobile.mockReturnValue(false)
    rerender(<BookListPage />)

    expect(await screen.findByTestId('grid-initial-search')).toHaveTextContent('typed')
  })
})
