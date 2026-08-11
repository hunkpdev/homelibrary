import { useCallback, useEffect, useRef, useState } from 'react'
import type { Page } from '@/api/types'

export interface WithId {
  id: string
}

export interface UseInfiniteBackendListOptions<T extends WithId> {
  fetchPage: (page: number, size: number) => Promise<Page<T>>
  resetKey: string | number
  pageSize?: number
}

export interface UseInfiniteBackendListResult<T extends WithId> {
  items: T[]
  isLoading: boolean
  isLoadingMore: boolean
  error: boolean
  hasMore: boolean
  totalElements: number
  loadMore: () => void
  retry: () => void
  updateItem: (id: string, updater: (item: T) => T) => void
  removeItem: (id: string) => void
}

export function useInfiniteBackendList<T extends WithId>({
  fetchPage,
  resetKey,
  pageSize = 20,
}: UseInfiniteBackendListOptions<T>): UseInfiniteBackendListResult<T> {
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalElements, setTotalElements] = useState(0)

  const fetchPageRef = useRef(fetchPage)
  fetchPageRef.current = fetchPage

  const generationRef = useRef(0)
  const pageIndexRef = useRef(0)
  const fetchInFlightRef = useRef(false)
  const retryActionRef = useRef<'initial' | 'more'>('initial')

  const runFetch = useCallback((page: number, generation: number, isInitial: boolean) => {
    fetchInFlightRef.current = true
    retryActionRef.current = isInitial ? 'initial' : 'more'

    fetchPageRef.current(page, pageSize)
      .then(data => {
        if (generation !== generationRef.current) return
        setItems(prev => (isInitial ? data.content : [...prev, ...data.content]))
        setHasMore(data.page.number + 1 < data.page.totalPages)
        setTotalElements(data.page.totalElements)
        setError(false)
        pageIndexRef.current = page
      })
      .catch(() => {
        if (generation !== generationRef.current) return
        setError(true)
      })
      .finally(() => {
        if (generation !== generationRef.current) return
        fetchInFlightRef.current = false
        setIsLoading(false)
        setIsLoadingMore(false)
      })
  }, [pageSize])

  useEffect(() => {
    generationRef.current += 1
    const generation = generationRef.current
    pageIndexRef.current = 0
    fetchInFlightRef.current = false
    setItems([])
    setHasMore(true)
    setTotalElements(0)
    setError(false)
    setIsLoading(true)
    setIsLoadingMore(false)
    runFetch(0, generation, true)
  }, [resetKey, runFetch])

  const loadMore = useCallback(() => {
    if (fetchInFlightRef.current || !hasMore) return
    setIsLoadingMore(true)
    runFetch(pageIndexRef.current + 1, generationRef.current, false)
  }, [hasMore, runFetch])

  const retry = useCallback(() => {
    if (fetchInFlightRef.current) return
    setError(false)
    if (retryActionRef.current === 'initial') {
      setIsLoading(true)
      runFetch(0, generationRef.current, true)
    } else {
      setIsLoadingMore(true)
      runFetch(pageIndexRef.current + 1, generationRef.current, false)
    }
  }, [runFetch])

  const updateItem = useCallback((id: string, updater: (item: T) => T) => {
    setItems(prev => prev.map(item => (item.id === id ? updater(item) : item)))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  return { items, isLoading, isLoadingMore, error, hasMore, totalElements, loadMore, retry, updateItem, removeItem }
}
