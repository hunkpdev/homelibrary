import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import type { RoomResponse } from '@/api/types'
import { RoomFormModal } from './RoomFormModal'

const mock = new MockAdapter(axiosInstance)

const existingRoom: RoomResponse = {
  id: 'room-1',
  name: 'Living Room',
  description: 'Main room',
  locationCount: 2,
  version: 3,
}

function renderModal(props: Partial<Parameters<typeof RoomFormModal>[0]> = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(
    <RoomFormModal
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

describe('RoomFormModal — create mode', () => {
  it('renders with empty name and description', () => {
    renderModal()
    expect(screen.getByPlaceholderText('Pl. Nappali')).toHaveValue('')
    expect(screen.getByPlaceholderText('Opcionális megjegyzés')).toHaveValue('')
  })

  it('shows create title', () => {
    renderModal()
    expect(screen.getByText('Új helyiség')).toBeInTheDocument()
  })

  it('submit button is disabled when name is empty', () => {
    renderModal()
    expect(screen.getByRole('button', { name: 'Mentés' })).toBeDisabled()
  })

  it('submit button becomes enabled after typing a name', async () => {
    renderModal()
    await userEvent.type(screen.getByPlaceholderText('Pl. Nappali'), 'Study')
    expect(screen.getByRole('button', { name: 'Mentés' })).not.toBeDisabled()
  })

  it('calls POST /api/rooms and fires onSuccess + onClose on success', async () => {
    mock.onPost('/api/rooms').reply(201, { ...existingRoom, id: 'new-1', name: 'Study' })
    const { onClose, onSuccess } = renderModal()

    await userEvent.type(screen.getByPlaceholderText('Pl. Nappali'), 'Study')
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
      expect(onClose).toHaveBeenCalledOnce()
    })
    expect(mock.history.post[0].data).toContain('"name":"Study"')
  })

  it('shows error message on unexpected failure', async () => {
    mock.onPost('/api/rooms').reply(500)
    renderModal()

    await userEvent.type(screen.getByPlaceholderText('Pl. Nappali'), 'Study')
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()
  })
})

describe('RoomFormModal — edit mode', () => {
  it('pre-fills name and description from the room prop', () => {
    renderModal({ room: existingRoom })
    expect(screen.getByPlaceholderText('Pl. Nappali')).toHaveValue('Living Room')
    expect(screen.getByPlaceholderText('Opcionális megjegyzés')).toHaveValue('Main room')
  })

  it('shows edit title', () => {
    renderModal({ room: existingRoom })
    expect(screen.getByText('Helyiség szerkesztése')).toBeInTheDocument()
  })

  it('calls PUT /api/rooms/:id with version and fires onSuccess + onClose on success', async () => {
    mock.onPut('/api/rooms/room-1').reply(200, existingRoom)
    const { onClose, onSuccess } = renderModal({ room: existingRoom })

    const nameInput = screen.getByPlaceholderText('Pl. Nappali')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Bedroom')
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce()
      expect(onClose).toHaveBeenCalledOnce()
    })
    const body = JSON.parse(mock.history.put[0].data)
    expect(body.name).toBe('Bedroom')
    expect(body.version).toBe(3)
  })

  it('clears previous error when modal reopens', async () => {
    mock.onPut('/api/rooms/room-1').reply(500)
    const { rerender } = render(
      <RoomFormModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} room={existingRoom} />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))
    expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()

    rerender(
      <RoomFormModal open={false} onClose={vi.fn()} onSuccess={vi.fn()} room={existingRoom} />
    )
    rerender(
      <RoomFormModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} room={existingRoom} />
    )

    expect(screen.queryByText('Váratlan hiba történt')).not.toBeInTheDocument()
  })
})
