import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useGridFilterSortHandoff } from './useGridFilterSortHandoff'

interface State {
  sort: string
}

const fakeApi = { id: 'fake-api' } as never

describe('useGridFilterSortHandoff', () => {
  it('calls seed() with the grid api, deferred by one tick', async () => {
    const seed = vi.fn()
    const { result } = renderHook(() =>
      useGridFilterSortHandoff<unknown, State>({
        initialState: { sort: 'title,asc' },
        onStateCapture: vi.fn(),
        seed,
        capture: () => ({ sort: 'title,asc' }),
      })
    )

    act(() => result.current.onGridReady({ api: fakeApi } as never))
    expect(seed).not.toHaveBeenCalled()

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    expect(seed).toHaveBeenCalledWith(fakeApi)
  })

  it('captures the latest state via onFilterChanged/onSortChanged and hands it off on unmount', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gridRefCurrent: any
    const capture = vi.fn().mockReturnValue({ sort: 'authors,desc' })
    const onStateCapture = vi.fn()

    const { result, unmount } = renderHook(() =>
      useGridFilterSortHandoff<unknown, State>({
        initialState: { sort: 'title,asc' },
        onStateCapture,
        seed: vi.fn(),
        capture,
      })
    )

    // Simulate AG Grid attaching its api via the ref, as ag-grid-react does.
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result.current.gridRef as any).current = { api: fakeApi }
      gridRefCurrent = result.current.gridRef.current
    })
    expect(gridRefCurrent).toBeTruthy()

    act(() => result.current.onFilterChanged())
    expect(capture).toHaveBeenCalledWith(fakeApi)

    unmount()

    expect(onStateCapture).toHaveBeenCalledWith({ sort: 'authors,desc' })
  })

  it('hands off the unchanged initial state on unmount when nothing was ever captured', () => {
    const onStateCapture = vi.fn()
    const { unmount } = renderHook(() =>
      useGridFilterSortHandoff<unknown, State>({
        initialState: { sort: 'title,asc' },
        onStateCapture,
        seed: vi.fn(),
        capture: vi.fn(),
      })
    )

    unmount()

    expect(onStateCapture).toHaveBeenCalledWith({ sort: 'title,asc' })
  })
})
