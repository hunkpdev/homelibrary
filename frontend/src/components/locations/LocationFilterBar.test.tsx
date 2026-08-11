import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocationFilterBar } from './LocationFilterBar'

const defaultProps = {
  search: '',
  onSearchChange: vi.fn(),
  sort: 'name,asc',
  onSortChange: vi.fn(),
  activeFilterCount: 0,
  onOpenFilters: vi.fn(),
  resultsCount: 5,
}

describe('LocationFilterBar — search debounce', () => {
  it('rapid, consecutive typing fires only a single onSearchChange call, after the debounce pause', async () => {
    const onSearchChange = vi.fn()
    render(<LocationFilterBar {...defaultProps} onSearchChange={onSearchChange} />)
    const input = screen.getByPlaceholderText('Keresés név szerint…')

    fireEvent.change(input, { target: { value: 'n' } })
    fireEvent.change(input, { target: { value: 'na' } })
    fireEvent.change(input, { target: { value: 'nappali' } })

    expect(onSearchChange).not.toHaveBeenCalled()

    await waitFor(() => expect(onSearchChange).toHaveBeenCalledOnce())
    expect(onSearchChange).toHaveBeenCalledWith('nappali')
  })
})

describe('LocationFilterBar — filters button', () => {
  it('shows the active filter count badge when there are active filters', () => {
    render(<LocationFilterBar {...defaultProps} activeFilterCount={1} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('hides the badge when there are no active filters', () => {
    render(<LocationFilterBar {...defaultProps} activeFilterCount={0} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('calls onOpenFilters when clicked', async () => {
    const onOpenFilters = vi.fn()
    render(<LocationFilterBar {...defaultProps} onOpenFilters={onOpenFilters} />)
    await userEvent.click(screen.getByRole('button', { name: 'Szűrők' }))
    expect(onOpenFilters).toHaveBeenCalledOnce()
  })
})

describe('LocationFilterBar — results count', () => {
  it('shows the results count when provided', () => {
    render(<LocationFilterBar {...defaultProps} resultsCount={4} />)
    expect(screen.getByText('4 találat')).toBeInTheDocument()
  })

  it('hides the results row while resultsCount is null (still loading)', () => {
    render(<LocationFilterBar {...defaultProps} resultsCount={null} />)
    expect(screen.queryByText(/találat/)).not.toBeInTheDocument()
  })
})
