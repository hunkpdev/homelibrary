import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import { LocationManagementPage } from './LocationManagementPage'
import type { RoomResponse, LocationResponse } from '@/api/types'

const mock = new MockAdapter(axiosInstance)

const makeToken = (role: 'ADMIN' | 'VISITOR') =>
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-1', username: 'user', role }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
  '.signature'

const roomA: RoomResponse = { id: 'room-1', name: 'Living Room', description: null, locationCount: 2, version: 0 }
const roomB: RoomResponse = { id: 'room-2', name: 'Bedroom', description: null, locationCount: 0, version: 0 }

const loc1: LocationResponse = { id: 'loc-1', name: 'Top Shelf', description: null, room: roomA, bookCount: 3, version: 0 }
const loc2: LocationResponse = { id: 'loc-2', name: 'Bottom Shelf', description: null, room: roomA, bookCount: 0, version: 0 }

vi.mock('ag-grid-react', () => ({
  AgGridReact: () => <div data-testid="ag-grid" />,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <LocationManagementPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mock.reset()
  mock.onGet('/api/rooms/all').reply(200, [roomA, roomB])
  mock.onGet('/api/locations/all').reply(200, [loc1, loc2])
  useLocationStore.setState({ locationsRefreshTrigger: 0 })
})

describe('LocationManagementPage — rooms panel', () => {
  it('shows all active rooms with locationCount badge', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()

    expect(await screen.findByText('Living Room')).toBeInTheDocument()
    expect(await screen.findByText('Bedroom')).toBeInTheDocument()
    expect(await screen.findByText('2 helyszín')).toBeInTheDocument()
  })

  it('VISITOR sees no action buttons in rooms panel', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderPage()

    await screen.findByText('Living Room')
    expect(screen.queryByLabelText('Szerkesztés')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Törlés')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('+ Helyszín')).not.toBeInTheDocument()
  })

  it('ADMIN sees delete button only for rooms with locationCount === 0', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()

    await screen.findByText('Living Room')
    await screen.findByText('Bedroom')

    const allDeleteButtons = screen.getAllByLabelText('Törlés')
    // Only Bedroom (locationCount=0) has a delete button in the rooms panel
    expect(allDeleteButtons).toHaveLength(1)
  })

  it('ADMIN sees "Új helyiség" button', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()

    expect(await screen.findByText('Új helyiség')).toBeInTheDocument()
  })
})

describe('LocationManagementPage — VISITOR grid', () => {
  it('VISITOR sees no action buttons in grid area', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderPage()

    await screen.findByText('Living Room')
    // AG Grid is mocked — verify no edit/delete buttons are rendered
    expect(screen.queryByLabelText('Szerkesztés')).not.toBeInTheDocument()
  })
})

describe('LocationManagementPage — data loading', () => {
  it('rooms panel lists all active rooms', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderPage()

    await screen.findByText('Living Room')
    expect(screen.getByText('Bedroom')).toBeInTheDocument()
  })

  it('fetches all locations from API on load', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderPage()

    await screen.findByText('Living Room')
    expect(mock.history.get.some(r => r.url === '/api/locations/all')).toBe(true)
  })
})
