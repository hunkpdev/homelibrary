import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface BaseModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  error?: string | null
  isLoading: boolean
  cancelLabel: string
  confirmLabel: string
  loadingLabel: string
  confirmVariant?: 'default' | 'destructive'
  confirmDisabled?: boolean
  onConfirm?: () => void
  formId?: string
  children?: ReactNode
}

export function BaseModal({
  open, onClose, title, description, error,
  isLoading, cancelLabel, confirmLabel, loadingLabel,
  confirmVariant = 'default', confirmDisabled, onConfirm, formId, children,
}: Readonly<BaseModalProps>) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            type={formId ? 'submit' : 'button'}
            form={formId}
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
          >
            {isLoading ? loadingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
