import { useEffect, useState } from 'react'

export function useDebouncedInput(
  value: string,
  onChange: (value: string) => void,
  delayMs: number
): [string, (value: string) => void] {
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onChange(draft), delayMs)
    return () => clearTimeout(timer)
    // value/onChange excluded on purpose: reacting to them here would refire the timer on every
    // parent re-render instead of only when the user actually types, defeating the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return [draft, setDraft]
}
