import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { fetchBooks } from '@/api/bookApi'
import type { BookResponse } from '@/api/types'
import { useBookStore } from '@/store/bookStore'
import { useAuthStore } from '@/store/authStore'
import { useInfiniteBackendList } from '@/hooks/useInfiniteBackendList'
import { InfiniteCardList } from '@/components/common/InfiniteCardList'
import { BookCard } from '@/components/books/BookCard'
import { BookFilterBar } from '@/components/books/BookFilterBar'
import { BookFiltersSheet } from '@/components/books/BookFiltersSheet'
import type { BookFiltersValues } from '@/components/books/BookFiltersSheet'
import { BookDetailPanel } from '@/components/books/BookDetailPanel'
import { BookFormModal } from '@/components/books/BookFormModal'
import { BookDeleteConfirmModal } from '@/components/books/BookDeleteConfirmModal'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 20

export interface BookCardViewProps {
  search: string
  onSearchChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  filters: BookFiltersValues
  onFiltersChange: (filters: BookFiltersValues) => void
}

export function BookCardView({
  search,
  onSearchChange,
  sort,
  onSortChange,
  filters,
  onFiltersChange,
}: Readonly<BookCardViewProps>) {
  const { t } = useTranslation()
  const isAdmin = useAuthStore(s => s.user?.role === 'ADMIN')
  const isDemo = useAuthStore(s => s.user?.role === 'DEMO')
  const { booksRefreshTrigger, incrementRefreshTrigger } = useBookStore()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<BookResponse | null>(null)
  const [selectedBook, setSelectedBook] = useState<BookResponse | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BookResponse | null>(null)
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false)

  const fetchPage = useCallback((page: number, size: number) => fetchBooks({
    page,
    size,
    sort,
    title: search || undefined,
    isbn: filters.isbn || undefined,
    authors: filters.authors || undefined,
    category: filters.category || undefined,
    publishYear: filters.publishYear || undefined,
  }), [sort, search, filters])

  const resetKey = useMemo(
    () => `${booksRefreshTrigger}|${sort}|${search}|${JSON.stringify(filters)}`,
    [booksRefreshTrigger, sort, search, filters]
  )

  const cardList = useInfiniteBackendList<BookResponse>({ fetchPage, resetKey, pageSize: PAGE_SIZE })

  const activeFilterCount = Object.values(filters).filter(value => value.trim() !== '').length

  const handleEditSuccess = useCallback((updatedBook?: BookResponse) => {
    if (updatedBook) {
      cardList.updateItem(updatedBook.id, () => updatedBook)
      setSelectedBook(updatedBook)
    }
  }, [cardList])

  const handleDeleteSuccess = useCallback(() => {
    if (deleteTarget) cardList.removeItem(deleteTarget.id)
    setSelectedBook(null)
  }, [cardList, deleteTarget])

  return (
    <div className="flex flex-col gap-4 pb-24">
      <BookFilterBar
        search={search}
        onSearchChange={onSearchChange}
        sort={sort}
        onSortChange={onSortChange}
        activeFilterCount={activeFilterCount}
        onOpenFilters={() => setFiltersSheetOpen(true)}
        resultsCount={cardList.isLoading ? null : cardList.totalElements}
      />

      <InfiniteCardList<BookResponse>
        items={cardList.items}
        renderItem={book => (
          <BookCard
            book={book}
            onOpen={setSelectedBook}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        )}
        isLoading={cardList.isLoading}
        isLoadingMore={cardList.isLoadingMore}
        error={cardList.error}
        hasMore={cardList.hasMore}
        onLoadMore={cardList.loadMore}
        onRetry={cardList.retry}
        emptyMessage={t('books.cardView.emptyState')}
      />

      {(isAdmin || isDemo) && (
        <Button
          className="fixed bottom-[calc(1.5rem_+_env(safe-area-inset-bottom))] right-6 h-14 w-14 rounded-full p-0 shadow-lg"
          aria-label={t('books.add.newBook')}
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      <BookFiltersSheet
        open={filtersSheetOpen}
        onClose={() => setFiltersSheetOpen(false)}
        filters={filters}
        onApply={onFiltersChange}
      />

      <BookFormModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={incrementRefreshTrigger}
      />

      <BookFormModal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        onSuccess={handleEditSuccess}
        book={editTarget ?? undefined}
      />

      <BookDetailPanel
        book={selectedBook}
        open={selectedBook !== null}
        onClose={() => setSelectedBook(null)}
        onEdit={setEditTarget}
        onDelete={setDeleteTarget}
      />

      <BookDeleteConfirmModal
        book={deleteTarget}
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}
