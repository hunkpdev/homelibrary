import { useEffect } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeContext, useThemeProvider } from '@/hooks/useTheme'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { decodeAuthUser, useAuthStore } from '@/store/authStore'

interface RefreshResponse {
  accessToken: string
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

let authInitStarted = false

function App() {
  const themeValue = useThemeProvider()
  const { setAuth, clearAuth, setInitialized } = useAuthStore()

  useEffect(() => {
    if (authInitStarted) return
    authInitStarted = true

    axios
      .post<RefreshResponse>(`${API_BASE}/api/auth/refresh`, {}, { withCredentials: true })
      .then(res => {
        const user = decodeAuthUser(res.data.accessToken)
        setAuth(res.data.accessToken, user)
      })
      .catch(() => {
        clearAuth()
      })
      .finally(() => {
        setInitialized()
      })
  }, [])

  return (
    <ThemeContext.Provider value={themeValue}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'VISITOR']} />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<div className="text-foreground">Üdvözlünk a Homelibraryban!</div>} />
              <Route path="/books" element={<div className="text-foreground">Könyvek</div>} />
              <Route path="/profile" element={<div className="text-foreground">Saját profil</div>} />
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/loans" element={<div className="text-foreground">Kölcsönzések</div>} />
                <Route path="/locations" element={<div className="text-foreground">Helyszínek</div>} />
                <Route path="/users" element={<div className="text-foreground">Felhasználók</div>} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  )
}

export default App
