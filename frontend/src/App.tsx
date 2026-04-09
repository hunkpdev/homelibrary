import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function App() {
  const { t } = useTranslation()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="p-8 text-foreground">{t('app.title')}</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
