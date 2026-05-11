import { beforeEach, describe, expect, it } from 'vitest'
import { useBookStore } from './bookStore'

beforeEach(() => {
  useBookStore.setState({ booksRefreshTrigger: 0 })
})

describe('useBookStore', () => {
  it('starts with trigger 0', () => {
    expect(useBookStore.getState().booksRefreshTrigger).toBe(0)
  })

  it('incrementRefreshTrigger increments the counter', () => {
    useBookStore.getState().incrementRefreshTrigger()
    expect(useBookStore.getState().booksRefreshTrigger).toBe(1)
  })
})
