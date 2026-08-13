import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookListPage } from './BookListPage'

const { gridModuleLoaded } = vi.hoisted(() => ({ gridModuleLoaded: { current: false } }))

vi.mock('@/pages/BookCardView', () => ({
  BookCardView: () => <div data-testid="book-card-view" />,
}))

vi.mock('@/pages/BookGridView', () => {
  gridModuleLoaded.current = true
  return {
    default: () => <div data-testid="book-grid-view" />,
  }
})

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }))
}

beforeEach(() => {
  gridModuleLoaded.current = false
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BookListPage — lazy grid chunk on mobile', () => {
  it('never imports the BookGridView module when the viewport is mobile from the first render', async () => {
    stubMatchMedia(true)
    render(<BookListPage />)

    expect(await screen.findByTestId('book-card-view')).toBeInTheDocument()
    expect(gridModuleLoaded.current).toBe(false)
  })
})
