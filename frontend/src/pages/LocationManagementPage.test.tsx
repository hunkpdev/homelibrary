import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import { useIsMobile } from '@/hooks/use-mobile'
import { LocationManagementPage } from './LocationManagementPage'
import type { RoomResponse } from '@/api/types'
import type { LocationCardViewProps } from './LocationCardView'
import type { LocationGridViewFilterState } from './LocationGridView'

const mock = new MockAdapter(axiosInstance)

const makeToken = (role: 'ADMIN' | 'VISITOR') =>
  'eyJhbGciOiJIUzI1NiJ9.' +
  btoa(JSON.stringify({ sub: 'uuid-1', username: 'user', role }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') +
  '.signature'

const roomA: RoomResponse = { id: 'room-1', name: 'Living Room', description: null, locationCount: 2, version: 0 }
const roomB: RoomResponse = { id: 'room-2', name: 'Bedroom', description: null, locationCount: 0, version: 0 }

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: vi.fn() }))

vi.mock('@/pages/LocationCardView', () => ({
  LocationCardView: (props: LocationCardViewProps) => (
    <div data-testid="location-card-view">
      <span data-testid="card-search">{props.search}</span>
      <span data-testid="card-reset-signal">{props.cardListResetSignal}</span>
      <button onClick={() => props.onSearchChange('typed')}>set-search</button>
    </div>
  ),
}))

vi.mock('@/pages/LocationGridView', () => ({
  default: (props: {
    initialFilterState: LocationGridViewFilterState
    onFilterStateCapture: (state: LocationGridViewFilterState) => void
  }) => (
    <div data-testid="location-grid-view">
      <span data-testid="grid-initial-search">{props.initialFilterState.search}</span>
      <button
        onClick={() => props.onFilterStateCapture({
          search: 'from-grid',
          sort: 'room.name,desc',
          filters: { roomId: '', description: '' },
        })}
      >
        capture
      </button>
    </div>
  ),
}))

const mockUseIsMobile = vi.mocked(useIsMobile)

function renderPage() {
  return render(<LocationManagementPage />)
}

beforeEach(() => {
  mock.reset()
  mock.onGet('/api/rooms/all').reply(200, [roomA, roomB])
  useLocationStore.setState({ locationsRefreshTrigger: 0 })
  mockUseIsMobile.mockReturnValue(false)
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

    expect(screen.getAllByLabelText('Törlés')).toHaveLength(1)
  })

  it('ADMIN sees "Új helyiség" button', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()

    expect(await screen.findByText('Új helyiség')).toBeInTheDocument()
  })
})

describe('LocationManagementPage — ADMIN interactions', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
  })

  it('clicking "Új helyiség" button opens room form modal', async () => {
    renderPage()
    fireEvent.click(await screen.findByText('Új helyiség'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('clicking edit room button opens room form modal', async () => {
    renderPage()
    await screen.findByText('Living Room')
    fireEvent.click(screen.getAllByLabelText('Szerkesztés')[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('LocationManagementPage — data loading', () => {
  it('rooms panel lists all active rooms', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderPage()

    await screen.findByText('Living Room')
    expect(screen.getByText('Bedroom')).toBeInTheDocument()
  })

  it('shows error message when the rooms API call fails', async () => {
    mock.onGet('/api/rooms/all').reply(500)
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()

    expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()
  })

  it('shows room description when present', async () => {
    mock.onGet('/api/rooms/all').reply(200, [{ ...roomA, description: 'Könyvespolc a nappaliban' }, roomB])
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderPage()

    expect(await screen.findByText('Könyvespolc a nappaliban')).toBeInTheDocument()
  })
})

describe('LocationManagementPage — room delete modal', () => {
  it('clicking delete button on room with no locations opens delete modal', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()

    await screen.findByText('Bedroom')
    fireEvent.click(screen.getByLabelText('Törlés'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('successful room deletion closes modal and triggers data reload', async () => {
    mock.onDelete('/api/rooms/room-2').reply(204)
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()

    await screen.findByText('Bedroom')
    fireEvent.click(screen.getByLabelText('Törlés'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Törlés' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mock.history.delete[0].url).toBe('/api/rooms/room-2')
  })

  it('bumps the card list reset signal, so the mobile card view fully resets', async () => {
    mock.onDelete('/api/rooms/room-2').reply(204)
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    mockUseIsMobile.mockReturnValue(true)
    renderPage()

    // On mobile the Rooms panel starts collapsed — open it before its buttons are reachable.
    fireEvent.click(await screen.findByText('Helyiségek'))
    await screen.findByText('Bedroom')
    expect(await screen.findByTestId('card-reset-signal')).toHaveTextContent('0')

    fireEvent.click(screen.getByLabelText('Törlés'))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Törlés' }))

    await waitFor(() => expect(screen.getByTestId('card-reset-signal')).toHaveTextContent('1'))
  })
})

describe('LocationManagementPage — collapsible panel', () => {
  it('rooms panel starts open and can be toggled closed', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'visitor', role: 'VISITOR' }, accessToken: makeToken('VISITOR'), isInitialized: true })
    renderPage()

    await screen.findByText('Living Room')
    fireEvent.click(screen.getByText('Helyiségek'))
    expect(screen.queryByText('Living Room')).not.toBeInTheDocument()
  })
})

describe('LocationManagementPage — add location button', () => {
  it('clicking "+ Helyszín" button opens location form modal', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()

    await screen.findByText('Living Room')
    fireEvent.click(screen.getAllByLabelText('+ Helyszín')[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('successful location creation bumps the card list reset signal', async () => {
    mock.onPost('/api/locations').reply(201, { id: 'new-1', name: 'Top Shelf', description: null, room: roomA, bookCount: 0, version: 0 })
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    mockUseIsMobile.mockReturnValue(true)
    renderPage()

    // On mobile the Rooms panel starts collapsed — open it before its buttons are reachable.
    fireEvent.click(await screen.findByText('Helyiségek'))
    await screen.findByText('Living Room')
    fireEvent.click(screen.getAllByLabelText('+ Helyszín')[0])
    await userEvent.type(screen.getByPlaceholderText('Pl. Felső polc'), 'Top Shelf')
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    await waitFor(() => expect(screen.getByTestId('card-reset-signal')).toHaveTextContent('1'))
  })
})

describe('LocationManagementPage — room form modal close', () => {
  it('closing room form modal hides dialog', async () => {
    useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: makeToken('ADMIN'), isInitialized: true })
    renderPage()

    fireEvent.click(await screen.findByText('Új helyiség'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Mégse' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('LocationManagementPage — view switching', () => {
  it('renders the grid view when not mobile', async () => {
    mockUseIsMobile.mockReturnValue(false)
    renderPage()
    expect(await screen.findByTestId('location-grid-view')).toBeInTheDocument()
    expect(screen.queryByTestId('location-card-view')).not.toBeInTheDocument()
  })

  it('renders the card view when mobile', async () => {
    mockUseIsMobile.mockReturnValue(true)
    renderPage()
    expect(await screen.findByTestId('location-card-view')).toBeInTheDocument()
    expect(screen.queryByTestId('location-grid-view')).not.toBeInTheDocument()

    await waitFor(() => expect(mock.history.get.some(r => r.url === '/api/rooms/all')).toBe(true))
    expect(mock.history.get.some(r => r.url === '/api/locations/all')).toBe(false)
  })
})

describe('LocationManagementPage — filter/sort state survives a breakpoint switch', () => {
  it('state captured from the grid is handed to the card view after switching to mobile', async () => {
    mockUseIsMobile.mockReturnValue(false)
    const { rerender } = renderPage()
    await screen.findByTestId('location-grid-view')

    await userEvent.click(screen.getByRole('button', { name: 'capture' }))

    mockUseIsMobile.mockReturnValue(true)
    rerender(<LocationManagementPage />)

    expect(await screen.findByTestId('card-search')).toHaveTextContent('from-grid')
  })

  it('state set in the card view is handed to the grid as its initial filter state after switching to desktop', async () => {
    mockUseIsMobile.mockReturnValue(true)
    const { rerender } = renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'set-search' }))

    mockUseIsMobile.mockReturnValue(false)
    rerender(<LocationManagementPage />)

    expect(await screen.findByTestId('grid-initial-search')).toHaveTextContent('typed')
  })
})
