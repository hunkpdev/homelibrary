import { Pencil, Trash2 } from 'lucide-react'
import { MutationButton } from '@/components/common/MutationButton'
import type { BookResponse } from '@/api/types'

export interface BookActionCellParams {
  data?: BookResponse
  isAdmin: boolean
  isDemo: boolean
  onEdit: (book: BookResponse) => void
  onDelete: (book: BookResponse) => void
  editLabel: string
  deleteLabel: string
}

export function BookActionCell({ data, isAdmin, isDemo, onEdit, onDelete, editLabel, deleteLabel }: Readonly<BookActionCellParams>) {
  if (!data || (!isAdmin && !isDemo)) return null
  return (
    <div className="flex gap-1 items-center h-full">
      <MutationButton variant="ghost" size="icon" className="h-7 w-7" aria-label={editLabel} onClick={() => onEdit(data)}>
        <Pencil className="h-3.5 w-3.5" />
      </MutationButton>
      <MutationButton
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-destructive"
        aria-label={deleteLabel}
        onClick={() => onDelete(data)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </MutationButton>
    </div>
  )
}
