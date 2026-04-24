import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { BaseModal } from '@/components/ui/BaseModal'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  onDelete: () => Promise<void>
  title: string
  description: string
  errorConflictMessage?: string
}

export function DeleteModal({ open, onClose, onSuccess, onDelete, title, description, errorConflictMessage }: Readonly<Props>) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsLoading(true)
    setError(null)
    try {
      await onDelete()
      onSuccess()
      onClose()
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409 && errorConflictMessage) {
        setError(errorConflictMessage)
      } else {
        setError(t('common.errorUnexpected'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleClose() {
    setError(null)
    onClose()
  }

  return (
    <BaseModal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      error={error}
      isLoading={isLoading}
      cancelLabel={t('common.cancel')}
      confirmLabel={t('common.delete')}
      loadingLabel={t('common.deleting')}
      confirmVariant="destructive"
      onConfirm={handleDelete}
    />
  )
}
