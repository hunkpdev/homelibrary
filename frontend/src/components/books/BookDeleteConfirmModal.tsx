import { useTranslation } from 'react-i18next'
import { deleteBook } from '@/api/bookApi'
import type { BookResponse } from '@/api/types'
import { DeleteModal } from '@/components/ui/DeleteModal'

interface Props {
  book: BookResponse | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function BookDeleteConfirmModal({ book, open, onClose, onSuccess }: Readonly<Props>) {
  const { t } = useTranslation()
  return (
    <DeleteModal
      open={open}
      onClose={onClose}
      onSuccess={onSuccess}
      onDelete={() => deleteBook(book!.id)}
      title={t('books.delete.title')}
      description={t('books.delete.confirm', { title: book?.title ?? '' })}
    />
  )
}
