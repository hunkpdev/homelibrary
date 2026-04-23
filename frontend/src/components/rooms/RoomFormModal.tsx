import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import type { RoomResponse } from '@/api/types'
import { createRoom, updateRoom } from '@/api/roomApi'
import { Input } from '@/components/ui/input'
import { BaseModal } from '@/components/ui/BaseModal'

const FORM_ID = 'room-form'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  room?: RoomResponse
}

export function RoomFormModal({ open, onClose, onSuccess, room }: Readonly<Props>) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(room?.name ?? '')
      setDescription(room?.description ?? '')
      setError(null)
    }
  }, [open, room])

  function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    void handleSubmit()
  }

  async function handleSubmit() {
    if (!name.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      if (room) {
        await updateRoom(room.id, { name: name.trim(), description: description.trim() || undefined, version: room.version })
      } else {
        await createRoom({ name: name.trim(), description: description.trim() || undefined })
      }
      onSuccess()
      onClose()
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError(t('locations.rooms.form.errorConflict'))
      } else {
        setError(t('locations.rooms.form.errorUnexpected'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={room ? t('locations.rooms.form.editTitle') : t('locations.rooms.form.createTitle')}
      error={error}
      isLoading={isLoading}
      cancelLabel={t('locations.rooms.form.cancel')}
      confirmLabel={t('locations.rooms.form.save')}
      loadingLabel={t('locations.rooms.form.saving')}
      confirmDisabled={!name.trim()}
      formId={FORM_ID}
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t('locations.rooms.form.nameLabel')}</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('locations.rooms.form.namePlaceholder')}
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t('locations.rooms.form.descriptionLabel')}</label>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('locations.rooms.form.descriptionPlaceholder')}
            disabled={isLoading}
          />
        </div>
      </form>
    </BaseModal>
  )
}
