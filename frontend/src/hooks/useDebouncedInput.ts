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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  return [draft, setDraft]
}
