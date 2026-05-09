import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MutationButton } from '@/components/common/MutationButton'
import { useAuthStore } from '@/store/authStore'
import type { BookResponse, BookSource, BookStatus } from '@/api/types'

const STATUS_VARIANT: Record<BookStatus, 'default' | 'secondary' | 'destructive'> = {
  AT_HOME: 'default',
  LOANED: 'secondary',
  DELETED: 'destructive',
}

interface DetailRowProps {
  label: string
  value: string | null | undefined
}

function DetailRow({ label, value }: Readonly<DetailRowProps>) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[130px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="break-words">{value}</span>
    </div>
  )
}

export interface BookDetailPanelProps {
  book: BookResponse | null
  open: boolean
  onClose: () => void
  onEdit: (book: BookResponse) => void
  onDelete: (book: BookResponse) => void
}

export function BookDetailPanel({ book, open, onClose, onEdit, onDelete }: Readonly<BookDetailPanelProps>) {
  const { t } = useTranslation()
  const isAdmin = useAuthStore(s => s.user?.role === 'ADMIN')
  const isDemo = useAuthStore(s => s.user?.role === 'DEMO')

  const statusLabel: Record<BookStatus, string> = {
    AT_HOME: t('books.status.AT_HOME'),
    LOANED: t('books.status.LOANED'),
    DELETED: t('books.status.DELETED'),
  }

  const sourceLabel: Record<BookSource, string> = {
    OSZK: t('books.source.OSZK'),
    MANUAL: t('books.source.MANUAL'),
  }

  if (!book) return null

  const locationText = book.location
    ? `${book.location.name} — ${book.location.room.name}`
    : null

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) onClose() }}>
      <SheetContent className="sm:max-w-md overflow-y-auto flex flex-col gap-6">
        <SheetHeader className="pr-6">
          <SheetTitle>{book.title}</SheetTitle>
          {book.authors.length > 0 && (
            <p className="text-sm text-muted-foreground">{book.authors.join(', ')}</p>
          )}
          <div>
            <Badge variant={STATUS_VARIANT[book.status]}>{statusLabel[book.status]}</Badge>
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-3">
          <DetailRow label={t('books.detail.isbn')} value={book.isbn} />
          <DetailRow label={t('books.detail.subtitle')} value={book.subtitle} />
          <DetailRow label={t('books.detail.publisher')} value={book.publisher} />
          <DetailRow label={t('books.detail.publishYear')} value={book.publishYear?.toString()} />
          <DetailRow label={t('books.detail.pageCount')} value={book.pageCount?.toString()} />
          <DetailRow label={t('books.detail.language')} value={book.language} />
          {book.categories.length > 0 && (
            <div className="grid grid-cols-[130px_1fr] gap-2 text-sm">
              <span className="text-muted-foreground shrink-0">{t('books.detail.categories')}</span>
              <div className="flex flex-wrap gap-1">
                {book.categories.map(c => (
                  <Badge key={c} variant="outline">{c}</Badge>
                ))}
              </div>
            </div>
          )}
          <DetailRow label={t('books.detail.source')} value={sourceLabel[book.source]} />
          <DetailRow label={t('books.detail.location')} value={locationText} />
          <DetailRow label={t('books.detail.createdAt')} value={new Date(book.createdAt).toLocaleDateString()} />
          {book.description && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{t('books.detail.description')}</span>
              <p className="whitespace-pre-wrap">{book.description}</p>
            </div>
          )}
        </div>

        {(isAdmin || isDemo) && (
          <>
            <Separator />
            <div className="flex gap-2">
              <MutationButton variant="outline" onClick={() => onEdit(book)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('books.detail.edit')}
              </MutationButton>
              <MutationButton variant="destructive" onClick={() => onDelete(book)}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </MutationButton>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
