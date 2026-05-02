import { beforeEach, describe, expect, it } from 'vitest'
import { useLocationStore } from './locationStore'

beforeEach(() => {
  useLocationStore.setState({ locationsRefreshTrigger: 0 })
})

describe('useLocationStore', () => {
  it('starts with trigger 0', () => {
    expect(useLocationStore.getState().locationsRefreshTrigger).toBe(0)
  })

  it('incrementRefreshTrigger increments the counter', () => {
    useLocationStore.getState().incrementRefreshTrigger()
    expect(useLocationStore.getState().locationsRefreshTrigger).toBe(1)
  })

  it('incrementRefreshTrigger is additive', () => {
    useLocationStore.getState().incrementRefreshTrigger()
    useLocationStore.getState().incrementRefreshTrigger()
    expect(useLocationStore.getState().locationsRefreshTrigger).toBe(2)
  })
})
