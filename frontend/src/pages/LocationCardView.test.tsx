import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MockAdapter from 'axios-mock-adapter'
import axiosInstance from '@/api/axiosInstance'
import { useAuthStore } from '@/store/authStore'
import { useLocationStore } from '@/store/locationStore'
import type { LocationResponse, RoomResponse } from '@/api/types'
import { EMPTY_LOCATION_FILTERS } from '@/components/locations/LocationFiltersSheet'
import { LocationCardView } from './LocationCardView'

const mock = new MockAdapter(axiosInstance)

class MockIntersectionObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

const room: RoomResponse = { id: 'room-1', name: 'Nappali', description: null, locationCount: 2, version: 0 }
const rooms: RoomResponse[] = [room]

const loc1: LocationResponse = {
  id: 'loc-1', name: 'Felső polc', description: null, room: { id: 'room-1', name: 'Nappali' }, bookCount: 0, version: 0,
}
const loc2: LocationResponse = { ...loc1, id: 'loc-2', name: 'Alsó polc' }

function renderCardView(props: Partial<Parameters<typeof LocationCardView>[0]> = {}) {
  const onSearchChange = vi.fn()
  const onSortChange = vi.fn()
  const onFiltersChange = vi.fn()
  render(
    <LocationCardView
      search=""
      onSearchChange={onSearchChange}
      sort="name,asc"
      onSortChange={onSortChange}
      filters={EMPTY_LOCATION_FILTERS}
      onFiltersChange={onFiltersChange}
      rooms={rooms}
      cardListResetSignal={0}
      {...props}
    />
  )
  return { onSearchChange, onSortChange, onFiltersChange }
}

beforeEach(() => {
  mock.reset()
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  useLocationStore.setState({ locationsRefreshTrigger: 0 })
  useAuthStore.setState({ user: { id: '1', username: 'admin', role: 'ADMIN' }, accessToken: null, isInitialized: true })
})

describe('LocationCardView — data & rendering', () => {
  it('fetches and renders locations as cards, with the results count', async () => {
    mock.onGet('/api/locations').reply(200, { content: [loc1, loc2], page: { totalElements: 2, totalPages: 1, size: 20, number: 0 } })
    renderCardView()

    expect(await screen.findByText('Felső polc')).toBeInTheDocument()
    expect(screen.getByText('Alsó polc')).toBeInTheDocument()
    expect(screen.getByText('2 találat')).toBeInTheDocument()
  })

  it('shows the error message and retry button, without a misleading results count, when the initial load fails', async () => {
    mock.onGet('/api/locations').reply(500)
    renderCardView()

    expect(await screen.findByText('Váratlan hiba történt')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Újrapróbálom' })).toBeInTheDocument()
    expect(screen.queryByText(/találat/)).not.toBeInTheDocument()
  })

  it('no FAB is rendered — location creation stays behind the Rooms panel', async () => {
    mock.onGet('/api/locations').reply(200, { content: [], page: { totalElements: 0, totalPages: 0, size: 20, number: 0 } })
    renderCardView()
    await waitFor(() => expect(mock.history.get.length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: 'Új helyszín' })).not.toBeInTheDocument()
  })
})

describe('LocationCardView — filters sheet "Törlés"', () => {
  it('clears both the search and the sheet filters, and refetches without any filter params', async () => {
    mock.onGet('/api/locations').reply(200, { content: [], page: { totalElements: 0, totalPages: 0, size: 20, number: 0 } })
    const { onSearchChange, onFiltersChange } = renderCardView({
      search: 'polc',
      filters: { ...EMPTY_LOCATION_FILTERS, roomId: 'room-1' },
    })

    await userEvent.click(await screen.findByRole('button', { name: 'Szűrők' }))
    await userEvent.click(screen.getByRole('button', { name: 'Törlés' }))

    expect(onSearchChange).toHaveBeenCalledWith('')
    expect(onFiltersChange).toHaveBeenCalledWith(EMPTY_LOCATION_FILTERS)
  })
})

describe('LocationCardView — resetKey', () => {
  it('a changed cardListResetSignal fully resets the list', async () => {
    mock.onGet('/api/locations').replyOnce(200, { content: [loc1], page: { totalElements: 1, totalPages: 1, size: 20, number: 0 } })
    const { rerender } = render(
      <LocationCardView
        search=""
        onSearchChange={vi.fn()}
        sort="name,asc"
        onSortChange={vi.fn()}
        filters={EMPTY_LOCATION_FILTERS}
        onFiltersChange={vi.fn()}
        rooms={rooms}
        cardListResetSignal={0}
      />
    )
    expect(await screen.findByText('Felső polc')).toBeInTheDocument()

    mock.onGet('/api/locations').replyOnce(200, { content: [loc2], page: { totalElements: 1, totalPages: 1, size: 20, number: 0 } })
    rerender(
      <LocationCardView
        search=""
        onSearchChange={vi.fn()}
        sort="name,asc"
        onSortChange={vi.fn()}
        filters={EMPTY_LOCATION_FILTERS}
        onFiltersChange={vi.fn()}
        rooms={rooms}
        cardListResetSignal={1}
      />
    )

    expect(await screen.findByText('Alsó polc')).toBeInTheDocument()
    expect(screen.queryByText('Felső polc')).not.toBeInTheDocument()
  })
})

describe('LocationCardView — mutation refresh strategy', () => {
  it('replaces the edited card in place after a successful edit, without refetching the list', async () => {
    mock.onGet('/api/locations').reply(200, { content: [loc1, loc2], page: { totalElements: 2, totalPages: 1, size: 20, number: 0 } })
    mock.onPut('/api/locations/loc-1').reply(200, { ...loc1, name: 'Felső polc Updated', version: 1 })
    renderCardView()
    await screen.findByText('Felső polc')

    const card1 = screen.getByText('Felső polc').closest('[data-testid="location-card"]') as HTMLElement
    await userEvent.click(within(card1).getByRole('button', { name: 'Szerkesztés' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    await waitFor(() => expect(screen.queryByText('Felső polc')).not.toBeInTheDocument())
    expect(screen.getByText('Felső polc Updated')).toBeInTheDocument()
    expect(screen.getByText('Alsó polc')).toBeInTheDocument()
    expect(screen.getAllByTestId('location-card')).toHaveLength(2)
    expect(mock.history.get.filter(r => r.url === '/api/locations')).toHaveLength(1)
    expect(useLocationStore.getState().locationsRefreshTrigger).toBe(1)
  })

  it('keeps the previous bookCount after editing — the PUT response always reports 0', async () => {
    const loc1WithBooks: LocationResponse = { ...loc1, bookCount: 3 }
    mock.onGet('/api/locations').reply(200, { content: [loc1WithBooks, loc2], page: { totalElements: 2, totalPages: 1, size: 20, number: 0 } })
    mock.onPut('/api/locations/loc-1').reply(200, { ...loc1WithBooks, name: 'Felső polc Updated', bookCount: 0, version: 1 })
    renderCardView()
    await screen.findByText('Felső polc')

    const card1 = screen.getByText('Felső polc').closest('[data-testid="location-card"]') as HTMLElement
    await userEvent.click(within(card1).getByRole('button', { name: 'Szerkesztés' }))
    await userEvent.click(screen.getByRole('button', { name: 'Mentés' }))

    await waitFor(() => expect(screen.queryByText('Felső polc')).not.toBeInTheDocument())
    const updatedCard = screen.getByText('Felső polc Updated').closest('[data-testid="location-card"]') as HTMLElement
    expect(within(updatedCard).getByText('3 könyv')).toBeInTheDocument()
    expect(within(updatedCard).queryByRole('button', { name: 'Törlés' })).not.toBeInTheDocument()
  })

  it('removes the deleted card from the list, without refetching', async () => {
    mock.onGet('/api/locations').reply(200, { content: [loc1, loc2], page: { totalElements: 2, totalPages: 1, size: 20, number: 0 } })
    mock.onDelete('/api/locations/loc-1').reply(204)
    renderCardView()
    await screen.findByText('Felső polc')

    const card1 = screen.getByText('Felső polc').closest('[data-testid="location-card"]') as HTMLElement
    await userEvent.click(within(card1).getByRole('button', { name: 'Törlés' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Törlés' }))

    await waitFor(() => expect(screen.queryByText('Felső polc')).not.toBeInTheDocument())
    expect(screen.getByText('Alsó polc')).toBeInTheDocument()
    expect(screen.getAllByTestId('location-card')).toHaveLength(1)
    expect(mock.history.get.filter(r => r.url === '/api/locations')).toHaveLength(1)
    expect(useLocationStore.getState().locationsRefreshTrigger).toBe(1)
  })
})
