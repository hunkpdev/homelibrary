import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { IsbnScannerInput } from './IsbnScannerInput'
import { lookupIsbn } from '@/api/isbnApi'
import type { IsbnLookupResult } from '@/api/types'
import { Button } from '@/components/ui/button'

interface Props {
  onResult: (result: IsbnLookupResult | null, isbn: string) => void
}

type PanelState = 'idle' | 'loading' | 'found' | 'not-found' | 'rate-limited' | 'error'

export function IsbnLookupPanel({ onResult }: Readonly<Props>) {
  const { t } = useTranslation()
  const [state, setState] = useState<PanelState>('idle')
  const [scannerKey, setScannerKey] = useState(0)

  const handleScan = async (isbn: string) => {
    setState('loading')
    try {
      const result = await lookupIsbn(isbn)
      setState(result === null ? 'not-found' : 'found')
      onResult(result, isbn)
    } catch (err) {
      setState(isAxiosError(err) && err.response?.status === 429 ? 'rate-limited' : 'error')
    }
  }

  const handleRetry = () => {
    setState('idle')
    setScannerKey(k => k + 1)
  }

  return (
    <div className="flex flex-col gap-4">
      <IsbnScannerInput
        key={scannerKey}
        onScan={handleScan}
        isLoading={state === 'loading'}
      />
      {state === 'loading' && (
        <p className="text-sm text-muted-foreground">{t('isbnLookup.connecting')}</p>
      )}
      {state === 'not-found' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t('isbnLookup.notFound')}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            {t('isbnLookup.retry')}
          </Button>
        </div>
      )}
      {state === 'rate-limited' && (
        <p className="text-sm text-destructive">{t('isbnLookup.rateLimit')}</p>
      )}
      {state === 'error' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-destructive">{t('common.errorUnexpected')}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            {t('isbnLookup.retry')}
          </Button>
        </div>
      )}
    </div>
  )
}
