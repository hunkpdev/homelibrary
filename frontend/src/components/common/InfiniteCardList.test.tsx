import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InfiniteCardList } from './InfiniteCardList'

interface Item {
  id: string
  name: string
}

let observeMock: ReturnType<typeof vi.fn>
let disconnectMock: ReturnType<typeof vi.fn>
let observerCallback: (entries: { isIntersecting: boolean }[]) => void
let observerOptions: IntersectionObserverInit | undefined

class MockIntersectionObserver {
  observe = observeMock
  disconnect = disconnectMock
  unobserve = vi.fn()

  constructor(callback: typeof observerCallback, options?: IntersectionObserverInit) {
    observerCallback = callback
    observerOptions = options
  }
}

beforeEach(() => {
  observeMock = vi.fn()
  disconnectMock = vi.fn()
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderList(props: Partial<Parameters<typeof InfiniteCardList<Item>>[0]> = {}) {
  const onLoadMore = vi.fn()
  const onRetry = vi.fn()
  render(
    <InfiniteCardList<Item>
      items={[]}
      renderItem={item => <span>{item.name}</span>}
      isLoading={false}
      isLoadingMore={false}
      error={false}
      hasMore={false}
      onLoadMore={onLoadMore}
      onRetry={onRetry}
      emptyMessage="Nincs találat"
      {...props}
    />
  )
  return { onLoadMore, onRetry }
}

describe('InfiniteCardList', () => {
  it('shows the empty-state message when there are no items, no error and nothing loading', () => {
    renderList()
    expect(screen.getByText('Nincs találat')).toBeInTheDocument()
  })

  it('calls onLoadMore when the end-of-list sentinel becomes visible', () => {
    const { onLoadMore } = renderList({ items: [{ id: '1', name: 'A' }], hasMore: true })
    expect(observeMock).toHaveBeenCalledOnce()

    observerCallback([{ isIntersecting: true }])

    expect(onLoadMore).toHaveBeenCalledOnce()
  })

  it('observes the sentinel with a 200px rootMargin, to prefetch before the user hits the bottom', () => {
    renderList({ items: [{ id: '1', name: 'A' }], hasMore: true })
    expect(observerOptions).toEqual({ rootMargin: '200px' })
  })

  it('shows a full-area error state with a retry button when the initial load fails', async () => {
    const { onRetry } = renderList({ items: [], error: true })
    expect(screen.getByText('Váratlan hiba történt')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Újrapróbálom' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows a bottom error bar with retry when a next-page fetch fails, keeping existing cards', async () => {
    const { onRetry } = renderList({ items: [{ id: '1', name: 'A' }], error: true, hasMore: true })
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('Váratlan hiba történt')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Újrapróbálom' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('shows a full-area loading indicator during the initial load', () => {
    renderList({ isLoading: true })
    expect(screen.getByTestId('infinite-card-list-loading')).toBeInTheDocument()
  })

  it('shows a compact loading indicator at the bottom while loading the next page, cards remain visible', () => {
    renderList({ items: [{ id: '1', name: 'A' }], isLoadingMore: true, hasMore: true })
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByTestId('infinite-card-list-loading-more')).toBeInTheDocument()
  })
})
