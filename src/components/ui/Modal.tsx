import type { ReactNode } from 'react';
import { Dialog } from './Dialog';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  className,
}: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={title}
      actions={actions}
      className={className}
    >
      {children}
    </Dialog>
  );
}

export default Modal;
