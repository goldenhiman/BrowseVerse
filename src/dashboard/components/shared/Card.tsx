import React, { forwardRef } from 'react';
import { cn } from './cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

/** Shadow border instead of CSS border — blends better with backgrounds (Emil's shadow-for-borders pattern) */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, onClick, hover }, ref) => {
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'rounded-xl bg-white p-5',
          // Shadow border — cleaner than border: 1px solid
          'shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
          // Isolate stacking context to avoid z-index wars
          'isolation-isolate',
          // Hover — only enhance, don't change layout
          hover &&
            'cursor-pointer transition-[box-shadow,transform] duration-150 ease-[var(--ease-out-cubic)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)] active:scale-[0.99]',
          onClick && !hover && 'cursor-pointer',
          className,
        )}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = 'Card';

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between', className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn('text-sm font-semibold text-surface-900', className)}>
      {children}
    </h3>
  );
}
