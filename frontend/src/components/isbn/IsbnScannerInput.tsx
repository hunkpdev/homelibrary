import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useZxing } from 'react-zxing'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  onScan: (isbn: string) => void
  isLoading: boolean
}

type Mode = 'detecting' | 'camera' | 'text'

export function IsbnScannerInput({ onScan, isLoading }: Readonly<Props>) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('detecting')
  const [textValue, setTextValue] = useState('')
  const [cameraPaused, setCameraPaused] = useState(false)

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMode('text')
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop())
        setMode('camera')
      })
      .catch(() => setMode('text'))
  }, [])

  const { ref } = useZxing({
    paused: isLoading || mode !== 'camera' || cameraPaused,
    onDecodeResult(result) {
      setCameraPaused(true)
      onScan(result.getText())
    },
  })

  const handleTextSubmit = () => {
    const trimmed = textValue.trim()
    if (trimmed) onScan(trimmed)
  }

  if (mode === 'detecting') {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (mode === 'camera') {
    return (
      <div className="flex flex-col gap-2">
        <video
          ref={ref}
          data-testid="isbn-camera-video"
          className={cn('w-full rounded-md', isLoading && 'opacity-50')}
        >
          <track kind="captions" />
        </video>
        {isLoading && (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        )}
      </div>
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
