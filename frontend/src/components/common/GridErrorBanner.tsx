import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export interface GridErrorBannerProps {
  onRetry: () => void
}

export function GridErrorBanner({ onRetry }: Readonly<GridErrorBannerProps>) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
      <span className="text-destructive">{t('common.errorUnexpected')}</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t('common.retry')}
      </Button>
    </div>
  )
}
