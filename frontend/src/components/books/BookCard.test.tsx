import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookCard } from './BookCard'
import { useAuthStore } from '@/store/authStore'
import type { BookResponse } from '@/api/types'

const book: BookResponse = {
  id: 'book-1',
  title: 'Title 1',
  isbn: '978-0-06-112008-4',
  subtitle: null,
  authors: ['Author 1', 'Author 2'],
  publisher: null,
  publishYear: 2024,
  pageCount: null,
  language: null,
  categories: ['Fiction'],
  description: null,
  coverImageUrl: null,
  status: 'AT_HOME',
  location: null,
  source: 'MANUAL',
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const defaultProps = {
  book,
  onOpen: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
}

beforeEach(() => {
  useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: null, isInitialized: true })
})

describe('BookCard — role-based actions', () => {
  it('shows enabled edit/delete buttons for ADMIN', () => {
    render(<BookCard {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Szerkesztés' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Törlés' })).toBeEnabled()
  })

  it('shows edit/delete buttons for DEMO, but disabled', () => {
    useAuthStore.setState({ user: { id: '1', username: 'demo', role: 'DEMO' }, accessToken: null, isInitialized: true })
    render(<BookCard {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Szerkesztés' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Törlés' })).toBeDisabled()
  })

  it('hides edit/delete buttons for VISITOR', () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: null, isInitialized: true })
    render(<BookCard {...defaultProps} />)
    expect(screen.queryByRole('button', { name: 'Szerkesztés' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Törlés' })).not.toBeInTheDocument()
  })
})

describe('BookCard — interaction', () => {
  it('is a keyboard-accessible button that opens the book on click', async () => {
    const onOpen = vi.fn()
    render(<BookCard {...defaultProps} onOpen={onOpen} />)
    const card = screen.getByTestId('book-card')
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabIndex', '0')

    await userEvent.click(card)
    expect(onOpen).toHaveBeenCalledWith(book)
  })

  it('opens the book on Enter key', async () => {
    const onOpen = vi.fn()
    render(<BookCard {...defaultProps} onOpen={onOpen} />)
    screen.getByTestId('book-card').focus()
    await userEvent.keyboard('{Enter}')
    expect(onOpen).toHaveBeenCalledWith(book)
  })

  it('clicking the edit button does not trigger onOpen', async () => {
    const onOpen = vi.fn()
    const onEdit = vi.fn()
    render(<BookCard {...defaultProps} onOpen={onOpen} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    expect(onEdit).toHaveBeenCalledWith(book)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('clicking the delete button does not trigger onOpen', async () => {
    const onOpen = vi.fn()
    const onDelete = vi.fn()
    render(<BookCard {...defaultProps} onOpen={onOpen} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Törlés' }))
    expect(onDelete).toHaveBeenCalledWith(book)
    expect(onOpen).not.toHaveBeenCalled()
  })
})

describe('BookCard — content', () => {
  it('shows title, authors, publish year, categories and isbn', () => {
    render(<BookCard {...defaultProps} />)
    expect(screen.getByText('Title 1')).toBeInTheDocument()
    expect(screen.getByText('Author 1; Author 2')).toBeInTheDocument()
    expect(screen.getByText('2024')).toBeInTheDocument()
    expect(screen.getByText('Fiction')).toBeInTheDocument()
    expect(screen.getByText('978-0-06-112008-4')).toBeInTheDocument()
  })
})
