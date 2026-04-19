import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/store/authStore'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function themeKey(userId: string | null) {
  return userId ? `theme_${userId}` : 'theme'
}

function readTheme(userId: string | null): Theme {
  const stored = localStorage.getItem(themeKey(userId))
  if (stored === 'dark' || stored === 'light') return stored
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useThemeProvider(): ThemeContextValue {
  const userId = useAuthStore(state => state.user?.id ?? null)
  const [theme, setTheme] = useState<Theme>(() => readTheme(userId))

  useEffect(() => {
    setTheme(readTheme(userId))
  }, [userId])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(themeKey(userId), theme)
  }, [theme, userId])

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])
}
