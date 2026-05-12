import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/store/authStore'

type Theme = 'light' | 'dark'
export type ColorTheme = 'zinc' | 'rose' | 'blue' | 'orange' | 'green' | 'violet'

export const COLOR_THEMES: ColorTheme[] = ['zinc', 'rose', 'blue', 'orange', 'green', 'violet']

export const COLOR_THEME_SWATCHES: Record<ColorTheme, string> = {
  zinc:   'oklch(0.205 0 0)',
  rose:   'oklch(0.645 0.246 16.439)',
  blue:   'oklch(0.546 0.245 262.881)',
  orange: 'oklch(0.646 0.222 41.116)',
  green:  'oklch(0.627 0.194 149.214)',
  violet: 'oklch(0.606 0.25 292.717)',
}

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  colorTheme: ColorTheme
  setColorTheme: (t: ColorTheme) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  colorTheme: 'zinc',
  setColorTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function themeKey(userId: string | null) {
  return userId ? `theme_${userId}` : 'theme'
}

function colorThemeKey(userId: string | null) {
  return userId ? `colorTheme_${userId}` : 'colorTheme'
}

function readTheme(userId: string | null): Theme {
  const stored = localStorage.getItem(themeKey(userId))
  if (stored === 'dark' || stored === 'light') return stored
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readColorTheme(userId: string | null): ColorTheme {
  const stored = localStorage.getItem(colorThemeKey(userId))
  if (stored && COLOR_THEMES.includes(stored as ColorTheme)) return stored as ColorTheme
  return 'zinc'
}

export function useThemeProvider(): ThemeContextValue {
  const userId = useAuthStore(state => state.user?.id ?? null)
  const [theme, setTheme] = useState<Theme>(() => readTheme(userId))
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => readColorTheme(userId))

  useEffect(() => {
    setTheme(readTheme(userId))
    setColorThemeState(readColorTheme(userId))
  }, [userId])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem(themeKey(userId), theme)
  }, [theme, userId])

  useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', colorTheme)
    localStorage.setItem(colorThemeKey(userId), colorTheme)
  }, [colorTheme, userId])

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const setColorTheme = useCallback((t: ColorTheme) => {
    setColorThemeState(t)
  }, [])

  return useMemo(
    () => ({ theme, toggleTheme, colorTheme, setColorTheme }),
    [theme, toggleTheme, colorTheme, setColorTheme]
  )
}
