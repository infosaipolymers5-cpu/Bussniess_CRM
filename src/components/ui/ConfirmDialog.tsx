/**
 * ConfirmDialog — for destructive or financial confirmations.
 * Shows explicit confirmation step. Never assumes success before server confirms.
 */

import { useTranslation } from 'react-i18next';
import { Dialog } from './Dialog';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="mb-6 text-sm text-slate-600">{description}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel ?? t('common.cancel')}
        </Button>
        <Button
          variant={destructive ? 'destructive' : 'primary'}
          onClick={() => void onConfirm()}
          loading={loading}
        >
          {confirmLabel ?? t('common.confirm')}
        </Button>
      </div>
    </Dialog>
  );
}

export default ConfirmDialog;
