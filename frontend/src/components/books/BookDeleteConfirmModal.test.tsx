import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookDeleteConfirmModal } from '@/components/books/BookDeleteConfirmModal'
import type { BookResponse } from '@/api/types'

const mock = new MockAdapter(axiosInstance)

const book: BookResponse = {
  id: 'book-1',
  title: 'Title 1',
  isbn: null,
  subtitle: null,
  authors: [],
  publisher: null,
  publishYear: null,
  pageCount: null,
  language: null,
  categories: [],
  description: null,
  coverImageUrl: null,
  status: 'AT_HOME',
  location: null,
  source: 'MANUAL',
  version: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

function renderModal(props: Partial<Parameters<typeof BookDeleteConfirmModal>[0]> = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(
    <BookDeleteConfirmModal
      book={book}
      open={true}
      onClose={onClose}
      onSuccess={onSuccess}
      {...props}
    />
  )
  return { onClose, onSuccess }
}

beforeEach(() => {
  mock.reset()
})

describe('BookDeleteConfirmModal', () => {
  it('renders dialog when open', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows book title in description', () => {
    renderModal()
    expect(screen.getByText(/Title 1/)).toBeInTheDocument()
  })

  it('calls DELETE /api/books/:id and fires onSuccess + onClose on success', async () => {
    mock.onDelete('/api/books/book-1').reply(204)
    const { onClose, onSuccess } = renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Törlés' }))
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
      expect(onClose).toHaveBeenCalledOnce()
    })
    expect(mock.history.delete[0].url).toBe('/api/books/book-1')
  })

  it('shows error message on unexpected failure', async () => {
    mock.onDelete('/api/books/book-1').reply(500)
    renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Törlés' }))
    expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()
  })

  it('cancel button fires onClose', async () => {
    const { onClose } = renderModal()
    await userEvent.click(screen.getByRole('button', { name: 'Mégse' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
