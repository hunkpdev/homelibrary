import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { AgGridReact } from 'ag-grid-react'
import type { GridApi, GridReadyEvent } from 'ag-grid-community'

export interface UseGridFilterSortHandoffOptions<TState> {
  initialState: TState
  onStateCapture: (state: TState) => void
  /** Apply initialState onto the grid (setFilterModel/applyColumnState, ref-driven filters, whatever the column setup needs). */
  seed: (api: GridApi) => void
  /** Read the grid's current filter/sort state back into TState. */
  capture: (api: GridApi) => TState
}

export interface UseGridFilterSortHandoffResult<TData> {
  gridRef: RefObject<AgGridReact<TData> | null>
  onGridReady: (params: GridReadyEvent<TData>) => void
  onFilterChanged: () => void
  onSortChanged: () => void
}

/**
 * Hands a grid's filter/sort state off to a sibling view that only exists while this one doesn't
 * (e.g. mobile card view <-> desktop grid), and seeds it back in on the way in — the "snapshot sync"
 * used by both the Books and Locations card-view features (step 10.2/10.3).
 */
export function useGridFilterSortHandoff<TData, TState>({
  initialState,
  onStateCapture,
  seed,
  capture,
}: UseGridFilterSortHandoffOptions<TState>): UseGridFilterSortHandoffResult<TData> {
  const gridRef = useRef<AgGridReact<TData>>(null)

  const onStateCaptureRef = useRef(onStateCapture)
  onStateCaptureRef.current = onStateCapture
  const seedRef = useRef(seed)
  seedRef.current = seed
  const captureRef = useRef(capture)
  captureRef.current = capture

  // Last-known grid state, kept in sync on every filter/sort change (not read lazily at unmount) —
  // AG Grid's imperative ref is torn down (via useImperativeHandle's layout effect) before this
  // hook's own effect cleanup runs, so gridRef.current is already null by unmount time.
  const latestStateRef = useRef(initialState)

  const syncLatestState = useCallback(() => {
    const api = gridRef.current?.api
    if (!api) return
    latestStateRef.current = captureRef.current(api)
  }, [])

  // Deferred a tick: applying a non-empty filter model in the same synchronous pass as the grid's
  // initial layout collapses the floating filter row's width calculation (a clear-button appearing
  // for the first time on a pre-filled value shifts layout mid-measurement).
  const onGridReady = useCallback((params: GridReadyEvent<TData>) => {
    setTimeout(() => seedRef.current(params.api), 0)
  }, [])

  // Hand the last-known state back up when the grid unmounts (switch to the sibling view).
  useEffect(() => () => {
    onStateCaptureRef.current(latestStateRef.current)
  }, [])

  return { gridRef, onGridReady, onFilterChanged: syncLatestState, onSortChanged: syncLatestState }
}
