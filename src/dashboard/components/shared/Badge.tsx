import React from 'react';
import { cn } from './cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
  className?: string;
}

const variants = {
  default: 'bg-surface-100 text-surface-600',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
  primary: 'bg-primary-50 text-primary-700',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        // Tabular nums for badges that show counts
        'font-variant-numeric-[tabular-nums]',
        variants[variant],
        className,
      )}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {children}
    </span>
  );
}
