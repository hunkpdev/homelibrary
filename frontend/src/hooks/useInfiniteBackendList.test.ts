import { StrictMode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useInfiniteBackendList } from './useInfiniteBackendList'
import type { Page } from '@/api/types'

interface Item {
  id: string
  name: string
}

function makePage(items: Item[], pageNumber: number, totalPages: number): Page<Item> {
  return {
    content: items,
    page: { totalElements: totalPages * items.length, totalPages, size: items.length, number: pageNumber },
  }
}

describe('useInfiniteBackendList', () => {
  it('appends the next page to the list on loadMore, without duplicating', async () => {
    const page0 = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }]
    const page1 = [{ id: '3', name: 'C' }]
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(makePage(page0, 0, 2))
      .mockResolvedValueOnce(makePage(page1, 1, 2))

    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.items).toEqual(page0)

    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false))

    expect(result.current.items).toEqual([...page0, ...page1])
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 20)
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1, 20)
  })

  it('exposes totalElements from the backend page response', async () => {
    const fetchPage = vi.fn().mockResolvedValue(makePage([{ id: '1', name: 'A' }, { id: '2', name: 'B' }], 0, 3))
    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.totalElements).toBe(6)
  })

  it('does not fetch again when there is no more page', async () => {
    const fetchPage = vi.fn().mockResolvedValue(makePage([{ id: '1', name: 'A' }], 0, 1))
    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.hasMore).toBe(false)

    act(() => result.current.loadMore())
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('clears the list and refetches from the start when resetKey changes', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(makePage([{ id: '1', name: 'A' }], 0, 2))
      .mockResolvedValueOnce(makePage([{ id: '9', name: 'Z' }], 0, 1))

    const { result, rerender } = renderHook(
      ({ resetKey }) => useInfiniteBackendList({ fetchPage, resetKey }),
      { initialProps: { resetKey: 'a' } }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.items).toEqual([{ id: '1', name: 'A' }])

    rerender({ resetKey: 'b' })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.items).toEqual([{ id: '9', name: 'Z' }])
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('does not refetch on rerender with an unchanged resetKey', async () => {
    const fetchPage = vi.fn().mockResolvedValue(makePage([{ id: '1', name: 'A' }], 0, 1))
    const { result, rerender } = renderHook(
      ({ resetKey }) => useInfiniteBackendList({ fetchPage, resetKey }),
      { initialProps: { resetKey: 'a' } }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    rerender({ resetKey: 'a' })
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('does not start a duplicate fetch on rapid consecutive loadMore calls while one is in flight', async () => {
    let resolvePage1: (p: Page<Item>) => void = () => {}
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(makePage([{ id: '1', name: 'A' }], 0, 3))
      .mockImplementationOnce(() => new Promise<Page<Item>>(resolve => { resolvePage1 = resolve }))

    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.loadMore()
      result.current.loadMore()
      result.current.loadMore()
    })
    expect(fetchPage).toHaveBeenCalledTimes(2)

    await act(async () => {
      resolvePage1(makePage([{ id: '2', name: 'B' }], 1, 3))
    })
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false))
  })

  it('sets error state on fetch failure and does not automatically retry', async () => {
    const fetchPage = vi.fn().mockRejectedValueOnce(new Error('network'))
    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe(true)
    expect(result.current.items).toEqual([])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('retry() repeats the last failed initial-load request', async () => {
    const fetchPage = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(makePage([{ id: '1', name: 'A' }], 0, 1))

    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }))
    await waitFor(() => expect(result.current.error).toBe(true))

    act(() => result.current.retry())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.items).toEqual([{ id: '1', name: 'A' }])
    expect(fetchPage).toHaveBeenNthCalledWith(2, 0, 20)
  })

  it('retry() after a failed loadMore repeats that page, not the first one', async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(makePage([{ id: '1', name: 'A' }], 0, 2))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(makePage([{ id: '2', name: 'B' }], 1, 2))

    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.loadMore())
    await waitFor(() => expect(result.current.error).toBe(true))
    expect(result.current.items).toEqual([{ id: '1', name: 'A' }])

    act(() => result.current.retry())
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false))

    expect(result.current.items).toEqual([{ id: '1', name: 'A' }, { id: '2', name: 'B' }])
    expect(fetchPage).toHaveBeenNthCalledWith(3, 1, 20)
  })

  it('discards a stale in-flight page response that resolves after a reset', async () => {
    let resolveStale: (p: Page<Item>) => void = () => {}
    const fetchPage = vi.fn()
      .mockResolvedValueOnce(makePage([{ id: '1', name: 'A' }], 0, 3))
      .mockImplementationOnce(() => new Promise<Page<Item>>(resolve => { resolveStale = resolve }))
      .mockResolvedValueOnce(makePage([{ id: '9', name: 'Z' }], 0, 1))

    const { result, rerender } = renderHook(
      ({ resetKey }) => useInfiniteBackendList({ fetchPage, resetKey }),
      { initialProps: { resetKey: 'a' } }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.loadMore())
    expect(result.current.isLoadingMore).toBe(true)

    rerender({ resetKey: 'b' })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.items).toEqual([{ id: '9', name: 'Z' }])

    await act(async () => {
      resolveStale(makePage([{ id: '2', name: 'B' }], 1, 3))
    })
    expect(result.current.items).toEqual([{ id: '9', name: 'Z' }])
  })

  it('updateItem replaces the matching item, the rest and order stay unchanged', async () => {
    const fetchPage = vi.fn().mockResolvedValue(
      makePage([{ id: '1', name: 'A' }, { id: '2', name: 'B' }], 0, 1)
    )
    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.updateItem('2', item => ({ ...item, name: 'B2' })))

    expect(result.current.items).toEqual([{ id: '1', name: 'A' }, { id: '2', name: 'B2' }])
  })

  it('removeItem removes the matching item from the accumulated list and decrements totalElements', async () => {
    const fetchPage = vi.fn().mockResolvedValue(
      makePage([{ id: '1', name: 'A' }, { id: '2', name: 'B' }], 0, 3)
    )
    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.totalElements).toBe(6)

    act(() => result.current.removeItem('1'))

    expect(result.current.items).toEqual([{ id: '2', name: 'B' }])
    expect(result.current.totalElements).toBe(5)
  })

  it('removeItem decrements totalElements by exactly one under StrictMode double-invocation', async () => {
    const fetchPage = vi.fn().mockResolvedValue(
      makePage([{ id: '1', name: 'A' }, { id: '2', name: 'B' }], 0, 3)
    )
    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }), {
      wrapper: StrictMode,
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.totalElements).toBe(6)

    act(() => result.current.removeItem('1'))

    expect(result.current.totalElements).toBe(5)
  })

  it('removeItem with a non-existent id leaves totalElements unchanged', async () => {
    const fetchPage = vi.fn().mockResolvedValue(
      makePage([{ id: '1', name: 'A' }, { id: '2', name: 'B' }], 0, 3)
    )
    const { result } = renderHook(() => useInfiniteBackendList({ fetchPage, resetKey: 'k' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.removeItem('does-not-exist'))

    expect(result.current.items).toEqual([{ id: '1', name: 'A' }, { id: '2', name: 'B' }])
    expect(result.current.totalElements).toBe(6)
  })
})
