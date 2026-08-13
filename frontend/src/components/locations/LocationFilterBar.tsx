import { useTranslation } from 'react-i18next'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDebouncedInput } from '@/hooks/useDebouncedInput'

const SEARCH_DEBOUNCE_MS = 350

export interface LocationFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  activeFilterCount: number
  onOpenFilters: () => void
  resultsCount: number | null
}

export function LocationFilterBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  activeFilterCount,
  onOpenFilters,
  resultsCount,
}: Readonly<LocationFilterBarProps>) {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useDebouncedInput(search, onSearchChange, SEARCH_DEBOUNCE_MS)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('locations.cardView.searchPlaceholder')}
            aria-label={t('locations.cardView.searchPlaceholder')}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="relative shrink-0"
          aria-label={t('locations.cardView.filtersButton')}
          onClick={onOpenFilters}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 && (
            <Badge className="absolute -right-1.5 -top-1.5 h-4 min-w-4 justify-center px-1 text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger aria-label={t('locations.cardView.sortLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name,asc">{t('locations.cardView.sort.nameAsc')}</SelectItem>
          <SelectItem value="name,desc">{t('locations.cardView.sort.nameDesc')}</SelectItem>
          <SelectItem value="room.name,asc">{t('locations.cardView.sort.roomAsc')}</SelectItem>
          <SelectItem value="room.name,desc">{t('locations.cardView.sort.roomDesc')}</SelectItem>
        </SelectContent>
      </Select>

      {resultsCount !== null && (
        <p className="text-xs text-muted-foreground">
          {t('locations.cardView.resultsCount', { count: resultsCount })}
        </p>
      )}
    </div>
  )
}
