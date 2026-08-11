import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useDebouncedInput } from './useDebouncedInput'

describe('useDebouncedInput', () => {
  it('rapid, consecutive updates fire only a single onChange call, after the debounce pause', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const { result } = renderHook(() => useDebouncedInput('', onChange, 350))

    act(() => {
      result.current[1]('h')
      result.current[1]('ha')
      result.current[1]('harry')
    })
    expect(result.current[0]).toBe('harry')
    expect(onChange).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(350))
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith('harry')

    vi.useRealTimers()
  })

  it('does not call onChange when the draft is set back to the current external value', () => {
    vi.useFakeTimers()
    const onChange = vi.fn()
    const { result } = renderHook(() => useDebouncedInput('harry', onChange, 350))

    act(() => result.current[1]('harry'))
    act(() => vi.advanceTimersByTime(350))

    expect(onChange).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('resyncs the draft when the external value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedInput(value, vi.fn(), 350),
      { initialProps: { value: 'a' } }
    )
    expect(result.current[0]).toBe('a')

    rerender({ value: 'b' })
    expect(result.current[0]).toBe('b')
  })
})
