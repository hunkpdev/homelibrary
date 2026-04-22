import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { LocationResponse } from '@/api/types'

export interface ActionCellParams {
  data?: LocationResponse
  isAdmin: boolean
  onDelete: (id: string) => void
  deleteLabel: string
  editLabel: string
}

export function ActionCell({ data, isAdmin, onDelete, deleteLabel, editLabel }: Readonly<ActionCellParams>) {
  if (!data || !isAdmin) return null
  return (
    <div className="flex gap-1 items-center h-full">
      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={editLabel}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      {data.bookCount === 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          aria-label={deleteLabel}
          onClick={() => onDelete(data.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
