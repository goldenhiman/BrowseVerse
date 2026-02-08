import React, { forwardRef } from 'react';
import { cn } from './cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variants = {
  // AlignUI fancy primary: gradient + refined shadow + glow on hover
  primary: [
    'bg-gradient-to-b from-primary-500 to-primary-700 text-white',
    'shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.12)]',
    'hover:to-primary-800 hover:shadow-[0_2px_8px_rgba(92,124,250,0.35),inset_0_1px_0_rgba(255,255,255,0.12)]',
    'active:from-primary-600 active:to-primary-800 active:shadow-[0_0_0_rgba(0,0,0,0)]',
  ].join(' '),

  // AlignUI fancy secondary: surface gradient + shadow border + inner highlight
  secondary: [
    'bg-gradient-to-b from-white to-surface-50 text-surface-700',
    'shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.8)]',
    'hover:from-surface-50 hover:to-surface-100 hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]',
    'active:from-surface-100 active:to-surface-150 active:shadow-[0_0_0_1px_rgba(0,0,0,0.08),inset_0_1px_3px_rgba(0,0,0,0.06)]',
  ].join(' '),

  ghost:
    'bg-transparent text-surface-600 hover:bg-surface-100 active:bg-surface-200',
  danger:
    'bg-error/10 text-error hover:bg-error/20 active:bg-error/30',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', type = 'button', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          // Base
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          // Transitions — specify exact properties, never transition-all
          'transition-[background,box-shadow,transform,opacity] duration-150 ease-[var(--ease-out-cubic)]',
          // Active press feel — Emil's 0.97 scale
          'active:scale-[0.97]',
          // Focus — neutral outline per Emil's guidance
          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-surface-400',
          // Variant
          variants[variant],
          // Size
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
