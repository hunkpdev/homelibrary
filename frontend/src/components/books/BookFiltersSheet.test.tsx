import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookFiltersSheet, EMPTY_BOOK_FILTERS } from './BookFiltersSheet'
import type { BookFiltersValues } from './BookFiltersSheet'

const filters: BookFiltersValues = { isbn: '123', authors: 'Author', category: 'Fiction', publishYear: '199' }

function renderSheet(props: Partial<Parameters<typeof BookFiltersSheet>[0]> = {}) {
  const onClose = vi.fn()
  const onApply = vi.fn()
  render(
    <BookFiltersSheet
      open={true}
      onClose={onClose}
      filters={EMPTY_BOOK_FILTERS}
      onApply={onApply}
      {...props}
    />
  )
  return { onClose, onApply }
}

describe('BookFiltersSheet', () => {
  it('pre-fills fields from the current filters when opened', () => {
    renderSheet({ filters })
    expect(screen.getByLabelText('ISBN')).toHaveValue('123')
    expect(screen.getByLabelText('Szerző(k)')).toHaveValue('Author')
    expect(screen.getByLabelText('Kategóriák')).toHaveValue('Fiction')
    expect(screen.getByLabelText('Kiadási év')).toHaveValue('199')
  })

  it('typing into a field alone does not call onApply', async () => {
    const { onApply } = renderSheet()
    await userEvent.type(screen.getByLabelText('ISBN'), '456')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('"Alkalmaz" applies the edited field values and closes', async () => {
    const { onApply, onClose } = renderSheet()
    await userEvent.type(screen.getByLabelText('ISBN'), '456')
    await userEvent.click(screen.getByRole('button', { name: 'Alkalmaz' }))
    expect(onApply).toHaveBeenCalledWith({ ...EMPTY_BOOK_FILTERS, isbn: '456' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('"Törlés" resets all fields to empty and closes', async () => {
    const { onApply, onClose } = renderSheet({ filters })
    await userEvent.click(screen.getByRole('button', { name: 'Törlés' }))
    expect(onApply).toHaveBeenCalledWith(EMPTY_BOOK_FILTERS)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
