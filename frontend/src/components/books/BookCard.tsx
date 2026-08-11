import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MutationButton } from '@/components/common/MutationButton'
import { useAuthStore } from '@/store/authStore'
import type { BookResponse } from '@/api/types'

export interface BookCardProps {
  book: BookResponse
  onOpen: (book: BookResponse) => void
  onEdit: (book: BookResponse) => void
  onDelete: (book: BookResponse) => void
}

export function BookCard({ book, onOpen, onEdit, onDelete }: Readonly<BookCardProps>) {
  const { t } = useTranslation()
  const isAdmin = useAuthStore(s => s.user?.role === 'ADMIN')
  const isDemo = useAuthStore(s => s.user?.role === 'DEMO')

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(book)
    }
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      data-testid="book-card"
      onClick={() => onOpen(book)}
      onKeyDown={handleKeyDown}
      className="cursor-pointer transition-colors hover:bg-accent/50"
    >
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium text-card-foreground">{book.title}</span>
            {book.authors.length > 0 && (
              <span className="text-sm text-muted-foreground">{book.authors.join('; ')}</span>
            )}
          </div>
          {(isAdmin || isDemo) && (
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label={t('common.edit')}
                onClick={e => { e.stopPropagation(); onEdit(book) }}
              >
                <Pencil className="h-3.5 w-3.5 text-primary" />
              </Button>
              <MutationButton
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                aria-label={t('common.delete')}
                onClick={e => { e.stopPropagation(); onDelete(book) }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </MutationButton>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {book.publishYear != null && (
            <span className="text-xs text-muted-foreground">{book.publishYear}</span>
          )}
          {book.categories.map(category => (
            <Badge key={category} variant="outline">{category}</Badge>
          ))}
        </div>

        {book.isbn && <span className="text-xs text-muted-foreground">{book.isbn}</span>}
      </CardContent>
    </Card>
  )
}
