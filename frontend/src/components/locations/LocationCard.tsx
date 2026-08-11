import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MutationButton } from '@/components/common/MutationButton'
import { useAuthStore } from '@/store/authStore'
import type { LocationResponse } from '@/api/types'

export interface LocationCardProps {
  location: LocationResponse
  onEdit: (location: LocationResponse) => void
  onDelete: (location: LocationResponse) => void
}

export function LocationCard({ location, onEdit, onDelete }: Readonly<LocationCardProps>) {
  const { t } = useTranslation()
  const isAdmin = useAuthStore(s => s.user?.role === 'ADMIN')
  const isDemo = useAuthStore(s => s.user?.role === 'DEMO')

  return (
    <Card data-testid="location-card">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="font-medium text-card-foreground">{location.name}</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{location.room.name}</Badge>
              <Badge variant="outline">{location.bookCount} {t('locations.grid.colBookCount')}</Badge>
            </div>
            {location.description && (
              <span className="text-sm text-muted-foreground">{location.description}</span>
            )}
          </div>
          {(isAdmin || isDemo) && (
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={t('common.edit')} onClick={() => onEdit(location)}>
                <Pencil className="h-3.5 w-3.5 text-primary" />
              </Button>
              {location.bookCount === 0 && (
                <MutationButton
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  aria-label={t('common.delete')}
                  onClick={() => onDelete(location)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </MutationButton>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
