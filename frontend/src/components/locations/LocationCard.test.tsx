import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocationCard } from './LocationCard'
import { useAuthStore } from '@/store/authStore'
import type { LocationResponse } from '@/api/types'

const location: LocationResponse = {
  id: 'loc-1',
  name: 'Felső polc',
  description: 'Regényes könyvek',
  room: { id: 'room-1', name: 'Nappali' },
  bookCount: 0,
  version: 0,
}

const defaultProps = {
  location,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
}

beforeEach(() => {
  useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: null, isInitialized: true })
})

describe('LocationCard — content', () => {
  it('shows name, room badge, bookCount badge and description', () => {
    render(<LocationCard {...defaultProps} />)
    expect(screen.getByText('Felső polc')).toBeInTheDocument()
    expect(screen.getByText('Nappali')).toBeInTheDocument()
    expect(screen.getByText('0 könyv')).toBeInTheDocument()
    expect(screen.getByText('Regényes könyvek')).toBeInTheDocument()
  })

  it('hides the description line when there is none', () => {
    render(<LocationCard {...defaultProps} location={{ ...location, description: null }} />)
    expect(screen.queryByText('Regényes könyvek')).not.toBeInTheDocument()
  })

  it('is not interactive — has no button role and tapping it does nothing', async () => {
    render(<LocationCard {...defaultProps} />)
    const card = screen.getByTestId('location-card')
    expect(card).not.toHaveAttribute('role', 'button')
    await userEvent.click(card)
    // no onOpen prop exists at all — nothing to assert beyond "it doesn't throw"
  })
})

describe('LocationCard — role-based actions', () => {
  it('ADMIN: edit always enabled, delete shown when bookCount is 0', () => {
    render(<LocationCard {...defaultProps} location={{ ...location, bookCount: 0 }} />)
    expect(screen.getByRole('button', { name: 'Szerkesztés' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Törlés' })).toBeEnabled()
  })

  it('ADMIN: delete button hidden when bookCount > 0', () => {
    render(<LocationCard {...defaultProps} location={{ ...location, bookCount: 3 }} />)
    expect(screen.getByRole('button', { name: 'Szerkesztés' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Törlés' })).not.toBeInTheDocument()
  })

  it('DEMO: both buttons visible, delete marked aria-disabled', () => {
    useAuthStore.setState({ user: { id: '1', username: 'demo', role: 'DEMO' }, accessToken: null, isInitialized: true })
    render(<LocationCard {...defaultProps} location={{ ...location, bookCount: 0 }} />)
    expect(screen.getByRole('button', { name: 'Szerkesztés' })).toBeEnabled()
    // MutationButton keeps the button natively enabled (aria-disabled, not disabled) for DEMO, so
    // it stays tappable and can show the "unavailable" tooltip on touch devices too.
    expect(screen.getByRole('button', { name: 'Törlés' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('VISITOR: no action buttons', () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: null, isInitialized: true })
    render(<LocationCard {...defaultProps} />)
    expect(screen.queryByRole('button', { name: 'Szerkesztés' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Törlés' })).not.toBeInTheDocument()
  })

  it('edit button calls onEdit with the location', async () => {
    const onEdit = vi.fn()
    render(<LocationCard {...defaultProps} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Szerkesztés' }))
    expect(onEdit).toHaveBeenCalledWith(location)
  })

  it('delete button calls onDelete with the location', async () => {
    const onDelete = vi.fn()
    render(<LocationCard {...defaultProps} onDelete={onDelete} />)
    await userEvent.click(screen.getByRole('button', { name: 'Törlés' }))
    expect(onDelete).toHaveBeenCalledWith(location)
  })
})
