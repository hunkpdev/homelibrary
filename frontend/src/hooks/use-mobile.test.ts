import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useIsMobile } from './use-mobile'

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

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useIsMobile', () => {
  it('reports the mobile viewport already on the first render, not just after the effect', () => {
    stubMatchMedia(true)
    const renders: boolean[] = []

    const { result } = renderHook(() => {
      const isMobile = useIsMobile()
      renders.push(isMobile)
      return isMobile
    })

    expect(renders).toEqual([true])
    expect(result.current).toBe(true)
  })

  it('reports the desktop viewport on the first render', () => {
    stubMatchMedia(false)
    const renders: boolean[] = []

    const { result } = renderHook(() => {
      const isMobile = useIsMobile()
      renders.push(isMobile)
      return isMobile
    })

    expect(renders).toEqual([false])
    expect(result.current).toBe(false)
  })
})
