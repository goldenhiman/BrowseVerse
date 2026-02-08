import React from 'react';
import { cn } from './cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div
          className="mb-4 text-surface-300 select-none pointer-events-none"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-surface-700">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-surface-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
