'use client'

import { Button } from '@/components/ui/button'
import { useModalDialog } from '@/hooks/useModalDialog'

interface ConfirmDialogProps {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { dialogRef, closeButtonRef } = useModalDialog(onCancel)

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="surface-card w-full max-w-sm p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-2">
          <h2 id="confirm-dialog-title" className="text-xl font-semibold tracking-[-0.03em]">
            {title}
          </h2>
          <p id="confirm-dialog-description" className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          <Button
            ref={closeButtonRef}
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? '처리 중...' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
