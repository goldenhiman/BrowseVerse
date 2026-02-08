import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Layers,
  Orbit,
  Sparkles,
  GitFork,
  Settings,
  ChevronLeft,
  ChevronRight,
  Brain,
} from 'lucide-react';
import { cn } from '../shared/cn';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview' },
  { to: '/timeline', icon: Clock, label: 'Timeline' },
  { to: '/categories', icon: Layers, label: 'Categories' },
  { to: '/constellations', icon: Orbit, label: 'Constellations' },
  { to: '/nebulas', icon: Sparkles, label: 'Nebulas' },
  { to: '/graph', icon: GitFork, label: 'Graph View' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-surface-200 bg-white',
        // Exact property transition — never transition-all
        'transition-[width] duration-200 ease-[var(--ease-out-cubic)]',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-3 border-b border-surface-200 px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600">
          <Brain className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-surface-900">
            BrowseVerse
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                // Exact property transitions
                'transition-[background-color,color] duration-150 ease-[var(--ease-out-cubic)]',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900',
                collapsed && 'justify-center px-0',
              )
            }
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-surface-200 p-2">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex w-full items-center justify-center rounded-lg p-2',
            'text-surface-400 hover:bg-surface-50 hover:text-surface-600',
            // Min 44px tap target
            'min-h-[44px]',
            'transition-[background-color,color] duration-150 ease-[var(--ease-out-cubic)]',
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );
}
