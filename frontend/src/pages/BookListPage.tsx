import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { BookCardView } from '@/pages/BookCardView'
import type { BookGridViewFilterState } from '@/pages/BookGridView'
import { EMPTY_BOOK_FILTERS } from '@/components/books/BookFiltersSheet'

const BookGridView = lazy(() => import('@/pages/BookGridView'))

function GridLoadingFallback() {
  return (
    <div className="flex w-full items-center justify-center" style={{ height: 500 }}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export function BookListPage() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('title,asc')
  const [filters, setFilters] = useState(EMPTY_BOOK_FILTERS)

  function handleFilterStateCapture(state: BookGridViewFilterState) {
    setSearch(state.search)
    setSort(state.sort)
    setFilters(state.filters)
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-foreground">{t('books.pageTitle')}</h1>

      {isMobile ? (
        <BookCardView
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          filters={filters}
          onFiltersChange={setFilters}
        />
      ) : (
        <Suspense fallback={<GridLoadingFallback />}>
          <BookGridView
            initialFilterState={{ search, sort, filters }}
            onFilterStateCapture={handleFilterStateCapture}
          />
        </Suspense>
      )}
    </div>
  )
}
