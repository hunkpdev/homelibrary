import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookDetailPanel } from '@/components/books/BookDetailPanel'
import { useAuthStore } from '@/store/authStore'
import type { BookResponse } from '@/api/types'

const book: BookResponse = {
  id: 'book-1',
  title: 'Title 1',
  isbn: '978-0-06-112008-4',
  subtitle: 'A subtitle',
  authors: ['Author 1', 'Author 2'],
  publisher: 'Publisher 1',
  publishYear: 2024,
  pageCount: 300,
  language: 'hu',
  categories: ['Fiction', 'Drama'],
  description: 'A nice description',
  coverImageUrl: null,
  status: 'AT_HOME',
  location: { id: 'loc-1', name: 'Felső polc', room: { id: 'room-1', name: 'Nappali' } },
  source: 'MANUAL',
  version: 1,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
}

const defaultProps = {
  book,
  open: true,
  onClose: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
}

beforeEach(() => {
  useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: null, isInitialized: true })
})

describe('BookDetailPanel — render', () => {
  it('renders nothing when book is null', () => {
    const { container } = render(<BookDetailPanel {...defaultProps} book={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows book title and authors', () => {
    render(<BookDetailPanel {...defaultProps} />)
    expect(screen.getByText('Title 1')).toBeInTheDocument()
    expect(screen.getByText('Author 1, Author 2')).toBeInTheDocument()
  })

  it('shows AT_HOME status badge', () => {
    render(<BookDetailPanel {...defaultProps} />)
    expect(screen.getByText('Itthon')).toBeInTheDocument()
  })

  it('shows isbn and subtitle when present', () => {
    render(<BookDetailPanel {...defaultProps} />)
    expect(screen.getByText('978-0-06-112008-4')).toBeInTheDocument()
    expect(screen.getByText('A subtitle')).toBeInTheDocument()
  })

  it('hides isbn row when isbn is null', () => {
    render(<BookDetailPanel {...defaultProps} book={{ ...book, isbn: null }} />)
    expect(screen.queryByText('978-0-06-112008-4')).not.toBeInTheDocument()
  })

  it('shows location formatted as "location — room"', () => {
    render(<BookDetailPanel {...defaultProps} />)
    expect(screen.getByText('Felső polc — Nappali')).toBeInTheDocument()
  })

  it('hides location row when location is null', () => {
    render(<BookDetailPanel {...defaultProps} book={{ ...book, location: null }} />)
    expect(screen.queryByText(/Nappali/)).not.toBeInTheDocument()
  })

  it('shows categories as badges', () => {
    render(<BookDetailPanel {...defaultProps} />)
    expect(screen.getByText('Fiction')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
  })

  it('shows description when present', () => {
    render(<BookDetailPanel {...defaultProps} />)
    expect(screen.getByText('A nice description')).toBeInTheDocument()
  })

  it('hides description block when description is null', () => {
    render(<BookDetailPanel {...defaultProps} book={{ ...book, description: null }} />)
    expect(screen.queryByText('A nice description')).not.toBeInTheDocument()
  })
})

describe('BookDetailPanel — ADMIN/DEMO/VISITOR buttons', () => {
  it('shows edit and delete buttons for ADMIN', () => {
    render(<BookDetailPanel {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Szerkesztés' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Törlés' })).toBeInTheDocument()
  })

  it('shows edit and delete buttons for DEMO', () => {
    useAuthStore.setState({ user: { id: '1', username: 'demo', role: 'DEMO' }, accessToken: null, isInitialized: true })
    render(<BookDetailPanel {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Szerkesztés' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Törlés' })).toBeInTheDocument()
  })

  it('hides edit and delete buttons for VISITOR', () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: null, isInitialized: true })
    render(<BookDetailPanel {...defaultProps} />)
    expect(screen.queryByRole('button', { name: 'Szerkesztés' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Törlés' })).not.toBeInTheDocument()
  })

  it('edit button calls onEdit with book', async () => {
    const onEdit = vi.fn()
    render(<BookDetailPanel {...defaultProps} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    expect(onEdit).toHaveBeenCalledWith(book)
  })

  it('delete button calls onDelete with book', async () => {
    const onDelete = vi.fn()
    render(<BookDetailPanel {...defaultProps} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Törlés' }))
    expect(onDelete).toHaveBeenCalledWith(book)
  })
})
