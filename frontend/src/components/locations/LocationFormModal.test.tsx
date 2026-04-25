import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import type { LocationResponse, RoomResponse } from '@/api/types'
import { LocationFormModal } from './LocationFormModal'

const mock = new MockAdapter(axiosInstance)

const rooms: RoomResponse[] = [
  { id: 'room-1', name: 'Living Room', description: null, locationCount: 2, version: 1 },
  { id: 'room-2', name: 'Bedroom', description: null, locationCount: 0, version: 1 },
]

const existingLocation: LocationResponse = {
  id: 'loc-1',
  name: 'Top Shelf',
  description: 'First shelf',
  room: rooms[0],
  bookCount: 0,
  version: 2,
}

function renderModal(props: Partial<Parameters<typeof LocationFormModal>[0]> = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(
    <LocationFormModal
      open={true}
      onClose={onClose}
      onSuccess={onSuccess}
      rooms={rooms}
      {...props}
    />
  )
  return { onClose, onSuccess }
}

beforeEach(() => {
  mock.reset()
})

describe('LocationFormModal — create mode', () => {
  it('renders with empty name and description', () => {
    renderModal()
    expect(screen.getByPlaceholderText('Pl. Felső polc')).toHaveValue('')
    expect(screen.getByPlaceholderText('Opcionális megjegyzés')).toHaveValue('')
  })

  it('shows create title', () => {
    renderModal()
    expect(screen.getByText('Új helyszín')).toBeInTheDocument()
  })

  it('save button is disabled when name is empty', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Mentés' })).toBeDisabled()
  })

  it('save button is disabled when name is filled but no room selected', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText('Pl. Felső polc'), 'Top Shelf')
    expect(screen.getByRole('button', { name: 'Mentés' })).toBeDisabled()
  })

  it('calls POST /api/locations and fires onSuccess + onClose on success', async () => {
    mock.onPost('/api/locations').reply(201, { ...existingLocation, id: 'new-1' })
    const { onClose, onSuccess } = renderModal({ defaultRoomId: 'room-1' })

    await userEvent.type(screen.getByPlaceholderText('Pl. Felső polc'), 'Top Shelf')
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
      expect(onClose).toHaveBeenCalledOnce()
    })
    const body = JSON.parse(mock.history.post[0].data)
    expect(body.name).toBe('Top Shelf')
    expect(body.roomId).toBe('room-1')
  })

  it('shows error message on unexpected failure', async () => {
    mock.onPost('/api/locations').reply(500)
    renderModal({ defaultRoomId: 'room-1' })

    await userEvent.type(screen.getByPlaceholderText('Pl. Felső polc'), 'Top Shelf')
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()
  })
})

describe('LocationFormModal — create from rooms panel', () => {
  it('pre-fills room name when defaultRoomId is provided', () => {
    renderModal({ defaultRoomId: 'room-1' })
    expect(screen.getByRole('combobox')).toHaveTextContent('Living Room')
  })

  it('room select is disabled when defaultRoomId is provided', () => {
    renderModal({ defaultRoomId: 'room-1' })
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})

describe('LocationFormModal — edit mode', () => {
  it('pre-fills name and description from location prop', () => {
    renderModal({ location: existingLocation })
    expect(screen.getByPlaceholderText('Pl. Felső polc')).toHaveValue('Top Shelf')
    expect(screen.getByPlaceholderText('Opcionális megjegyzés')).toHaveValue('First shelf')
  })

  it('shows edit title', () => {
    renderModal({ location: existingLocation })
    expect(screen.getByText('Helyszín szerkesztése')).toBeInTheDocument()
  })

  it('room select is disabled in edit mode', () => {
    renderModal({ location: existingLocation })
    expect(screen.getByRole('combobox')).toBeDisabled()
  })

  it('calls PUT /api/locations/:id with version and fires onSuccess + onClose on success', async () => {
    mock.onPut('/api/locations/loc-1').reply(200, existingLocation)
    const { onClose, onSuccess } = renderModal({ location: existingLocation })

    const nameInput = screen.getByPlaceholderText('Pl. Felső polc')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Bottom Shelf')
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
      expect(onClose).toHaveBeenCalledOnce()
    })
    const body = JSON.parse(mock.history.put[0].data)
    expect(body.name).toBe('Bottom Shelf')
    expect(body.version).toBe(2)
  })

  it('shows conflict error on 409 response', async () => {
    mock.onPut('/api/locations/loc-1').reply(409)
    renderModal({ location: existingLocation })

    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    expect(await screen.findByText('Ez a névváltoztatás ütközést okozna')).toBeInTheDocument()
  })

  it('clears previous error when modal reopens', async () => {
    mock.onPut('/api/locations/loc-1').reply(500)
    const { rerender } = render(
      <LocationFormModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} rooms={rooms} location={existingLocation} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))
    expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()

    rerender(
      <LocationFormModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} rooms={rooms} location={existingLocation} />
    )
    rerender(
      <LocationFormModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} rooms={rooms} location={existingLocation} />
    )

    expect(screen.queryByText('Váratlan hiba történt')).not.toBeInTheDocument()
  })
})
