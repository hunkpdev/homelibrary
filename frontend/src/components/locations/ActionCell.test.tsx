import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { LocationResponse } from '@/api/types'
import { ActionCell } from './ActionCell'

const location: LocationResponse = {
  id: 'loc-1',
  name: 'Top Shelf',
  description: null,
  room: { id: 'room-1', name: 'Living Room' },
  bookCount: 0,
  version: 1,
}

const defaultProps = {
  data: location,
  isAdmin: true,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  editLabel: 'Edit',
  deleteLabel: 'Delete',
}

describe('ActionCell', () => {
  it('isAdmin false → renders nothing', () => {
    const { container } = render(<ActionCell {...defaultProps} isAdmin={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('isAdmin true, bookCount 0 → shows edit and delete buttons', () => {
    render(<ActionCell {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('isAdmin true, bookCount > 0 → shows only edit button', () => {
    render(<ActionCell {...defaultProps} data={{ ...location, bookCount: 3 }} />)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })

  it('edit and delete buttons call their callbacks with the location data', async () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(<ActionCell {...defaultProps} onEdit={onEdit} onDelete={onDelete} />)

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith(location)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(location)
  })
})
