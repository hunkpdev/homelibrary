import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useZxing } from 'react-zxing'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  onScan: (isbn: string) => void
  isLoading: boolean
}

export interface IsbnScannerInputHandle {
  reset: () => void
}

type Mode = 'detecting' | 'camera' | 'text'

export const IsbnScannerInput = forwardRef<IsbnScannerInputHandle, Readonly<Props>>(
  function IsbnScannerInput({ onScan, isLoading }, ref) {
    const { t } = useTranslation()
    const [mode, setMode] = useState<Mode>('detecting')
    const [textValue, setTextValue] = useState('')
    const [cameraPaused, setCameraPaused] = useState(false)

    useImperativeHandle(ref, () => ({
      reset: () => setCameraPaused(false),
    }))

    useEffect(() => {
      let cancelled = false
      if (!navigator.mediaDevices?.enumerateDevices) {
        setMode('text')
        return
      }
      navigator.mediaDevices
        .enumerateDevices()
        .then(devices => {
          if (cancelled) return
          setMode(devices.some(d => d.kind === 'videoinput') ? 'camera' : 'text')
        })
        .catch(() => { if (!cancelled) setMode('text') })
      return () => { cancelled = true }
    }, [])

    const { ref: videoRef } = useZxing({
      paused: isLoading || mode !== 'camera' || cameraPaused,
      constraints: {
        video: { facingMode: 'environment' },
        audio: false,
      },
      onDecodeResult(result) {
        setCameraPaused(true)
        onScan(result.getText())
      },
      onError: () => setMode('text'),
    })

    const handleTextSubmit = () => {
      if (textValue.trim()) onScan(textValue.trim())
    }

    if (mode === 'detecting') {
      return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
    }

    if (mode === 'camera') {
      return (
        <video
          ref={videoRef}
          data-testid="isbn-camera-video"
          className={cn('w-full rounded-md', isLoading && 'opacity-50')}
        >
          <track kind="captions" />
        </video>
      )
    }

    return (
      <div className="flex gap-2">
        <Input
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit() }}
          placeholder={t('isbnScanner.placeholder')}
          disabled={isLoading}
        />
        <Button
          type="button"
          onClick={handleTextSubmit}
          disabled={isLoading || !textValue.trim()}
        >
          {t('isbnScanner.search')}
        </Button>
      </div>
    )
  }
)
