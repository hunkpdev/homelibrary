import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SEARCH_DEBOUNCE_MS = 350

export interface BookFilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  activeFilterCount: number
  onOpenFilters: () => void
  resultsCount: number | null
}

export function BookFilterBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  activeFilterCount,
  onOpenFilters,
  resultsCount,
}: Readonly<BookFilterBarProps>) {
  const { t } = useTranslation()
  const [searchInput, setSearchInput] = useState(search)

  useEffect(() => setSearchInput(search), [search])

  useEffect(() => {
    if (searchInput === search) return
    const timer = setTimeout(() => onSearchChange(searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder={t('books.cardView.searchPlaceholder')}
            aria-label={t('books.cardView.searchPlaceholder')}
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="relative shrink-0"
          aria-label={t('books.cardView.filtersButton')}
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
        <SelectTrigger aria-label={t('books.cardView.sortLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="title,asc">{t('books.cardView.sort.titleAsc')}</SelectItem>
          <SelectItem value="title,desc">{t('books.cardView.sort.titleDesc')}</SelectItem>
          <SelectItem value="authors,asc">{t('books.cardView.sort.authorsAsc')}</SelectItem>
          <SelectItem value="authors,desc">{t('books.cardView.sort.authorsDesc')}</SelectItem>
          <SelectItem value="publishYear,desc">{t('books.cardView.sort.publishYearDesc')}</SelectItem>
          <SelectItem value="publishYear,asc">{t('books.cardView.sort.publishYearAsc')}</SelectItem>
        </SelectContent>
      </Select>

      {resultsCount !== null && (
        <p className="text-xs text-muted-foreground">
          {t('books.cardView.resultsCount', { count: resultsCount })}
        </p>
      )}
    </div>
  )
}
