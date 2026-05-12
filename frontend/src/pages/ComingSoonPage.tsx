import { useTranslation } from 'react-i18next'
import { Construction } from 'lucide-react'

export function ComingSoonPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Construction className="h-12 w-12 text-primary" />
      <h2 className="text-lg font-semibold text-foreground">{t('comingSoon.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('comingSoon.subtitle')}</p>
    </div>
  )
}
