import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface BookFiltersValues {
  isbn: string
  authors: string
  category: string
  publishYear: string
}

export const EMPTY_BOOK_FILTERS: BookFiltersValues = {
  isbn: '',
  authors: '',
  category: '',
  publishYear: '',
}

export interface BookFiltersSheetProps {
  open: boolean
  onClose: () => void
  filters: BookFiltersValues
  onApply: (filters: BookFiltersValues) => void
}

export function BookFiltersSheet({ open, onClose, filters, onApply }: Readonly<BookFiltersSheetProps>) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<BookFiltersValues>(filters)

  useEffect(() => {
    if (open) setDraft(filters)
  }, [open, filters])

  function setField(key: keyof BookFiltersValues) {
    return (value: string) => setDraft(prev => ({ ...prev, [key]: value }))
  }

  function handleApply() {
    onApply(draft)
    onClose()
  }

  function handleClear() {
    onApply(EMPTY_BOOK_FILTERS)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('books.cardView.filtersSheetTitle')}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bookFilterIsbn" className="text-sm font-medium">{t('books.add.isbnLabel')}</label>
            <Input id="bookFilterIsbn" value={draft.isbn} onChange={e => setField('isbn')(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bookFilterAuthors" className="text-sm font-medium">{t('books.add.authorsLabel')}</label>
            <Input id="bookFilterAuthors" value={draft.authors} onChange={e => setField('authors')(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bookFilterCategory" className="text-sm font-medium">{t('books.add.categoriesLabel')}</label>
            <Input id="bookFilterCategory" value={draft.category} onChange={e => setField('category')(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bookFilterPublishYear" className="text-sm font-medium">{t('books.add.publishYearLabel')}</label>
            <Input id="bookFilterPublishYear" value={draft.publishYear} onChange={e => setField('publishYear')(e.target.value)} />
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
