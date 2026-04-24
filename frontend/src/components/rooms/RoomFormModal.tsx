import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { RoomResponse } from '@/api/types'
import { createRoom, updateRoom } from '@/api/roomApi'
import { useFormSubmit } from '@/hooks/useFormSubmit'
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

  useEffect(() => {
    if (open) {
      setName(room?.name ?? '')
      setDescription(room?.description ?? '')
    }
  }, [open, room])

  const { isLoading, error, onSubmit } = useFormSubmit({
    open,
    conflictErrorKey: 'locations.rooms.form.errorConflict',
    onSuccess,
    onClose,
    submitFn: async () => {
      if (room) {
        await updateRoom(room.id, { name: name.trim(), description: description.trim() || undefined, version: room.version })
      } else {
        await createRoom({ name: name.trim(), description: description.trim() || undefined })
      }
    },
  })

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={room ? t('locations.rooms.form.editTitle') : t('locations.rooms.form.createTitle')}
      error={error}
      isLoading={isLoading}
      cancelLabel={t('common.cancel')}
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
