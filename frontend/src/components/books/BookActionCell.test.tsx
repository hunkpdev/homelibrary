import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { BookResponse } from '@/api/types'
import { BookActionCell } from './BookActionCell'

const book: BookResponse = {
  id: 'book-1',
  isbn: '978-0-06-112008-4',
  title: 'To Kill a Mockingbird',
  subtitle: null,
  authors: ['Harper Lee'],
  publisher: null,
  publishYear: 1960,
  pageCount: 281,
  language: 'en',
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
  data: book,
  isAdmin: true,
  isDemo: false,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  editLabel: 'Edit',
  deleteLabel: 'Delete',
}

describe('BookActionCell', () => {
  it('no data → renders nothing', () => {
    const { container } = render(<BookActionCell {...defaultProps} data={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('isAdmin false, isDemo false → renders nothing', () => {
    const { container } = render(<BookActionCell {...defaultProps} isAdmin={false} isDemo={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('isAdmin true → shows edit and delete buttons', () => {
    render(<BookActionCell {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('isDemo true → shows edit and delete buttons', () => {
    render(<BookActionCell {...defaultProps} isAdmin={false} isDemo={true} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('edit and delete buttons call their callbacks with the book data', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<BookActionCell {...defaultProps} onEdit={onEdit} onDelete={onDelete} />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith(book)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(book)
  })
})
