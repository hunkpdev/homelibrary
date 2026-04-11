import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeContext, useThemeProvider } from '@/hooks/useTheme'
import { AppLayout } from '@/components/layout/AppLayout'

function App() {
  const themeValue = useThemeProvider()

  return (
    <ThemeContext.Provider value={themeValue}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div className="text-foreground">Üdvözlünk a Homelibraryban!</div>} />
            <Route path="/books" element={<div className="text-foreground">Könyvek</div>} />
            <Route path="/locations" element={<div className="text-foreground">Helyszínek</div>} />
            <Route path="/loans" element={<div className="text-foreground">Kölcsönzések</div>} />
            <Route path="/users" element={<div className="text-foreground">Felhasználók</div>} />
            <Route path="/profile" element={<div className="text-foreground">Saját profil</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  )
}

export default App
