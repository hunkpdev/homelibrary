import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'

interface Options {
  open: boolean
  conflictErrorKey: string
  onSuccess: () => void
  onClose: () => void
  submitFn: () => Promise<void>
}

export function useFormSubmit({ open, conflictErrorKey, onSuccess, onClose, submitFn }: Options) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) setError(null)
  }, [open])

  function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    void handleSubmit()
  }

  async function handleSubmit() {
    setIsLoading(true)
    setError(null)
    try {
      await submitFn()
      onSuccess()
      onClose()
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError(t(conflictErrorKey))
      } else {
        setError(t('common.errorUnexpected'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, error, onSubmit }
}
