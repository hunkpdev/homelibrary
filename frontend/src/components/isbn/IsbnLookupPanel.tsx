import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { Loader2 } from 'lucide-react'
import { IsbnScannerInput } from './IsbnScannerInput'
import type { IsbnScannerInputHandle } from './IsbnScannerInput'
import { lookupIsbn } from '@/api/isbnApi'
import type { IsbnLookupResult, RateLimitExceededResponse } from '@/api/types'
import { Button } from '@/components/ui/button'

type ErrorReason = 'rate-limited-session' | 'rate-limited-daily' | 'error'

interface Props {
  onResult: (result: IsbnLookupResult | null, isbn: string) => void
  onError?: (reason: ErrorReason) => void
}

type PanelState = 'idle' | 'loading' | 'found' | 'not-found' | ErrorReason

export function IsbnLookupPanel({ onResult, onError }: Readonly<Props>) {
  const { t } = useTranslation()
  const [state, setState] = useState<PanelState>('idle')
  const scannerRef = useRef<IsbnScannerInputHandle>(null)

  const handleScan = async (isbn: string) => {
    setState('loading')
    try {
      const result = await lookupIsbn(isbn)
      setState(result === null ? 'not-found' : 'found')
      onResult(result, isbn)
    } catch (err) {
      let reason: ErrorReason
      if (isAxiosError(err) && err.response?.status === 429) {
        const data = err.response.data as RateLimitExceededResponse
        reason = data?.reason === 'DEMO_SESSION_LIMIT_EXCEEDED' ? 'rate-limited-session' : 'rate-limited-daily'
      } else {
        reason = 'error'
      }
      setState(reason)
      onError?.(reason)
    }
  }

  const handleRetry = () => {
    setState('idle')
    scannerRef.current?.reset()
  }

  return (
    <div className="flex flex-col gap-4">
      <IsbnScannerInput
        ref={scannerRef}
        onScan={handleScan}
        isLoading={state === 'loading'}
      />
      {state === 'loading' && (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" data-testid="loading-spinner" />
          {t('isbnLookup.connecting')}
        </p>
      )}
      {state === 'not-found' && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{t('isbnLookup.notFound')}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            {t('isbnLookup.retry')}
          </Button>
        </div>
      )}
      {state === 'rate-limited-daily' && (
        <p className="text-sm text-destructive">{t('isbnLookup.rateLimit.daily')}</p>
      )}
      {state === 'rate-limited-session' && (
        <p className="text-sm text-destructive">{t('isbnLookup.rateLimit.session')}</p>
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
