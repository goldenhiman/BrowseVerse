import React, { forwardRef, useId } from 'react';
import { cn } from './cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id: externalId, ...props }, ref) => {
    const autoId = useId();
    const inputId = externalId || autoId;

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-surface-600 cursor-pointer"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          spellCheck={false}
          className={cn(
            // Base — 16px font minimum to prevent iOS Safari zoom
            'w-full rounded-lg bg-white px-3 py-2 text-sm text-surface-900',
            // Shadow border — consistent with Card's approach
            'shadow-[0_0_0_1px_rgba(0,0,0,0.08)] ring-0',
            'placeholder:text-surface-400',
            // Focus — exact property transitions
            'focus:shadow-[0_0_0_1px_var(--color-primary-400)] focus:ring-2 focus:ring-primary-500/20 focus:outline-none',
            'transition-[box-shadow] duration-150 ease-[var(--ease-out-cubic)]',
            // Error
            error && 'shadow-[0_0_0_1px_var(--color-error)] focus:shadow-[0_0_0_1px_var(--color-error)] focus:ring-error/20',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
