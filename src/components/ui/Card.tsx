import type { ReactNode } from 'react';
import clsx from 'clsx';

export interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'rounded-xl border border-gray-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}

export default Card;
