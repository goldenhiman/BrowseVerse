import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-surface-200 bg-white px-6 after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-gradient-to-b after:from-surface-50 after:to-transparent">
      <div className="min-w-0 flex-1 mr-4">
        {/* text-wrap: balance is applied globally to all headings */}
        <h1 className="text-base font-semibold text-surface-900 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-surface-500 truncate max-w-xl leading-snug">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}
