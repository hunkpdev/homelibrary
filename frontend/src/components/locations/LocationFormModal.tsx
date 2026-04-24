import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LocationResponse, RoomResponse } from '@/api/types'
import { createLocation, updateLocation } from '@/api/locationApi'
import { useFormSubmit } from '@/hooks/useFormSubmit'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BaseModal } from '@/components/ui/BaseModal'

const FORM_ID = 'location-form'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  location?: LocationResponse
  rooms: RoomResponse[]
  defaultRoomId?: string
}

export function LocationFormModal({ open, onClose, onSuccess, location, rooms, defaultRoomId }: Readonly<Props>) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [roomId, setRoomId] = useState('')

  useEffect(() => {
    if (open) {
      setName(location?.name ?? '')
      setDescription(location?.description ?? '')
      setRoomId(location?.room.id ?? defaultRoomId ?? '')
    }
  }, [open, location, defaultRoomId])

  const { isLoading, error, onSubmit } = useFormSubmit({
    open,
    conflictErrorKey: 'locations.form.errorConflict',
    onSuccess,
    onClose,
    submitFn: async () => {
      if (location) {
        await updateLocation(location.id, { name: name.trim(), description: description.trim() || undefined, version: location.version })
      } else {
        await createLocation({ name: name.trim(), roomId, description: description.trim() || undefined })
      }
    },
  })

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={location ? t('locations.form.editTitle') : t('locations.form.createTitle')}
      error={error}
      isLoading={isLoading}
      cancelLabel={t('common.cancel')}
      confirmLabel={t('locations.form.save')}
      loadingLabel={t('locations.form.saving')}
      confirmDisabled={!name.trim() || !roomId}
      formId={FORM_ID}
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t('locations.form.nameLabel')}</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('locations.form.namePlaceholder')}
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t('locations.form.descriptionLabel')}</label>
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('locations.form.descriptionPlaceholder')}
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">{t('locations.form.roomLabel')}</label>
          <Select value={roomId} onValueChange={setRoomId} disabled={isLoading || !!location || !!defaultRoomId}>
            <SelectTrigger>
              <SelectValue placeholder={t('locations.form.roomPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {rooms.map(r => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </form>
    </BaseModal>
  )
}
