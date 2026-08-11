import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EMPTY_LOCATION_FILTERS, LocationFiltersSheet } from './LocationFiltersSheet'
import type { LocationFiltersValues } from './LocationFiltersSheet'
import type { RoomResponse } from '@/api/types'

const rooms: RoomResponse[] = [
  { id: 'room-1', name: 'Nappali', description: null, locationCount: 2, version: 0 },
  { id: 'room-2', name: 'Hálószoba', description: null, locationCount: 0, version: 0 },
]

function renderSheet(props: Partial<Parameters<typeof LocationFiltersSheet>[0]> = {}) {
  const onClose = vi.fn()
  const onApply = vi.fn()
  render(
    <LocationFiltersSheet
      open={true}
      onClose={onClose}
      filters={EMPTY_LOCATION_FILTERS}
      onApply={onApply}
      rooms={rooms}
      {...props}
    />
  )
  return { onClose, onApply }
}

describe('LocationFiltersSheet', () => {
  it('pre-fills fields from the current filters when opened', () => {
    const filters: LocationFiltersValues = { roomId: 'room-1', description: 'polc' }
    renderSheet({ filters })
    expect(screen.getByText('Nappali')).toBeInTheDocument()
    expect(screen.getByLabelText('Leírás')).toHaveValue('polc')
  })

  it('typing into the description field alone does not call onApply', async () => {
    const { onApply } = renderSheet()
    await userEvent.type(screen.getByLabelText('Leírás'), 'polc')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('"Alkalmaz" applies the selected room and typed description, then closes', async () => {
    const { onApply, onClose } = renderSheet()
    await userEvent.type(screen.getByLabelText('Leírás'), 'polc')
    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(screen.getByRole('option', { name: 'Nappali' }))
    await userEvent.click(screen.getByRole('button', { name: 'Alkalmaz' }))

    expect(onApply).toHaveBeenCalledWith({ roomId: 'room-1', description: 'polc' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('"Törlés" resets all fields to empty and closes', async () => {
    const filters: LocationFiltersValues = { roomId: 'room-1', description: 'polc' }
    const { onApply, onClose } = renderSheet({ filters })
    await userEvent.click(screen.getByRole('button', { name: 'Törlés' }))

    expect(onApply).toHaveBeenCalledWith(EMPTY_LOCATION_FILTERS)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
