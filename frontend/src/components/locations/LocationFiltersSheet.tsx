import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RoomResponse } from '@/api/types'

export interface LocationFiltersValues {
  roomId: string
  description: string
}

export const EMPTY_LOCATION_FILTERS: LocationFiltersValues = {
  roomId: '',
  description: '',
}

const ALL_ROOMS_VALUE = '__all__'

export interface LocationFiltersSheetProps {
  open: boolean
  onClose: () => void
  filters: LocationFiltersValues
  onApply: (filters: LocationFiltersValues) => void
  rooms: RoomResponse[]
}

export function LocationFiltersSheet({ open, onClose, filters, onApply, rooms }: Readonly<LocationFiltersSheetProps>) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<LocationFiltersValues>(filters)

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  function handleApply() {
    onApply(draft)
    onClose()
  }

  function handleClear() {
    onApply(EMPTY_LOCATION_FILTERS)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('locations.cardView.filtersSheetTitle')}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="locationFilterRoom">{t('locations.form.roomLabel')}</label>
            <Select
              value={draft.roomId || ALL_ROOMS_VALUE}
              onValueChange={v => setDraft(prev => ({ ...prev, roomId: v === ALL_ROOMS_VALUE ? '' : v }))}
            >
              <SelectTrigger id="locationFilterRoom">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ROOMS_VALUE}>{t('locations.grid.filterAllRooms')}</SelectItem>
                {rooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="locationFilterDescription">{t('locations.form.descriptionLabel')}</label>
            <Input
              id="locationFilterDescription"
              value={draft.description}
              onChange={e => setDraft(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={handleClear}>{t('common.clearFilters')}</Button>
          <Button onClick={handleApply}>{t('common.applyFilters')}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
