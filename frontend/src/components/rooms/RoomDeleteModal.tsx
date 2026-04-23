import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import type { RoomResponse } from '@/api/types'
import { deleteRoom } from '@/api/roomApi'
import { BaseModal } from '@/components/ui/BaseModal'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  room?: RoomResponse
}

export function RoomDeleteModal({ open, onClose, onSuccess, room }: Readonly<Props>) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!room) return
    setIsLoading(true)
    setError(null)
    try {
      await deleteRoom(room.id)
      onSuccess()
      onClose()
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError(t('locations.rooms.delete.errorConflict'))
      } else {
        setError(t('locations.rooms.delete.errorUnexpected'))
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
      title={t('locations.rooms.delete.title')}
      description={t('locations.rooms.delete.confirm', { name: room?.name ?? '' })}
      error={error}
      isLoading={isLoading}
      cancelLabel={t('locations.rooms.delete.cancel')}
      confirmLabel={t('locations.rooms.delete.delete')}
      loadingLabel={t('locations.rooms.delete.deleting')}
      confirmVariant="destructive"
      onConfirm={handleDelete}
    />
  )
}
