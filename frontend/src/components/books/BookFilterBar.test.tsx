import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookFilterBar } from './BookFilterBar'

const defaultProps = {
  search: '',
  onSearchChange: vi.fn(),
  sort: 'title,asc',
  onSortChange: vi.fn(),
  activeFilterCount: 0,
  onOpenFilters: vi.fn(),
  resultsCount: 5,
}

describe('BookFilterBar — search debounce', () => {
  it('rapid, consecutive typing fires only a single onSearchChange call, after the debounce pause', async () => {
    const onSearchChange = vi.fn()
    render(<BookFilterBar {...defaultProps} onSearchChange={onSearchChange} />)
    const input = screen.getByPlaceholderText('Keresés cím szerint…')

    // fireEvent is synchronous (no per-keystroke delay), so this reliably simulates fast typing
    // without depending on fake timers, which hang here due to a known vitest/user-event incompatibility.
    fireEvent.change(input, { target: { value: 'h' } })
    fireEvent.change(input, { target: { value: 'ha' } })
    fireEvent.change(input, { target: { value: 'har' } })
    fireEvent.change(input, { target: { value: 'harr' } })
    fireEvent.change(input, { target: { value: 'harry' } })

    expect(onSearchChange).not.toHaveBeenCalled()

    await waitFor(() => expect(onSearchChange).toHaveBeenCalledOnce())
    expect(onSearchChange).toHaveBeenCalledWith('harry')
  })
})

describe('BookFilterBar — filters button', () => {
  it('shows the active filter count badge when there are active filters', () => {
    render(<BookFilterBar {...defaultProps} activeFilterCount={2} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('hides the badge when there are no active filters', () => {
    render(<BookFilterBar {...defaultProps} activeFilterCount={0} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('calls onOpenFilters when clicked', async () => {
    const onOpenFilters = vi.fn()
    render(<BookFilterBar {...defaultProps} onOpenFilters={onOpenFilters} />)
    await userEvent.click(screen.getByRole('button', { name: 'Szűrők' }))
    expect(onOpenFilters).toHaveBeenCalledOnce()
  })
})

describe('BookFilterBar — results count', () => {
  it('shows the results count when provided', () => {
    render(<BookFilterBar {...defaultProps} resultsCount={7} />)
    expect(screen.getByText('7 találat')).toBeInTheDocument()
  })

  it('hides the results row while resultsCount is null (still loading)', () => {
    render(<BookFilterBar {...defaultProps} resultsCount={null} />)
    expect(screen.queryByText(/találat/)).not.toBeInTheDocument()
  })
})
