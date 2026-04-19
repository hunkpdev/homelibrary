import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function ForbiddenPage() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-4xl font-bold">{t('forbidden.title')}</h1>
      <p className="text-muted-foreground">{t('forbidden.message')}</p>
      <Link to="/" className="text-primary underline underline-offset-4">
        {t('forbidden.backHome')}
      </Link>
    </div>
  )
}
