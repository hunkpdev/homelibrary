import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MutationButton } from '@/components/common/MutationButton'
import type { LocationResponse } from '@/api/types'

export interface ActionCellParams {
  data?: LocationResponse
  isAdmin: boolean
  isDemo: boolean
  onEdit: (location: LocationResponse) => void
  onDelete: (location: LocationResponse) => void
  deleteLabel: string
  editLabel: string
}

export function ActionCell({ data, isAdmin, isDemo, onEdit, onDelete, deleteLabel, editLabel }: Readonly<ActionCellParams>) {
  if (!data || (!isAdmin && !isDemo)) return null
  return (
    <div className="flex gap-1 items-center h-full">
      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={editLabel} onClick={() => onEdit(data)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      {data.bookCount === 0 && (
        <MutationButton
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          aria-label={deleteLabel}
          onClick={() => onDelete(data)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </MutationButton>
      )}
    </div>
  )
}
