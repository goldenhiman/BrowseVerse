import React, { useState, useMemo } from 'react';
import { Header } from '../components/layout/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { EmptyState } from '../components/shared/EmptyState';
import { useRecentPages } from '../hooks/usePages';
import { useRecentSessions } from '../hooks/useSessions';
import { Globe, Clock, Filter, ChevronDown, Trash2 } from 'lucide-react';
import { pagesRepo } from '../../db/repositories/pages';
import type { Page, Session } from '../../shared/types';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function groupByDate(pages: Page[]): Map<string, Page[]> {
  const groups = new Map<string, Page[]>();
  for (const page of pages) {
    const dateKey = new Date(page.last_seen_at).toDateString();
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey)!.push(page);
  }
  return groups;
}

export default function Timeline() {
  const [domainFilter, setDomainFilter] = useState('');
  const [limit, setLimit] = useState(100);
  const pages = useRecentPages(limit);
  const sessions = useRecentSessions(20);

  const filteredPages = useMemo(() => {
    if (!pages) return [];
    if (!domainFilter) return pages;
    return pages.filter((p) =>
      p.domain.toLowerCase().includes(domainFilter.toLowerCase()),
    );
  }, [pages, domainFilter]);

  const groupedPages = useMemo(() => groupByDate(filteredPages), [filteredPages]);

  return (
    <div>
      <Header
        title="Timeline"
        subtitle="Your browsing history, structured by time"
        actions={
          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter by domain..."
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="w-48"
            />
          </div>
        }
      />

      <div className="p-6">
        {filteredPages.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-12 w-12" />}
            title="No pages in your timeline"
            description="Browse the web and your activity will appear here"
          />
        ) : (
          <div className="space-y-8">
            {Array.from(groupedPages.entries()).map(([dateStr, dayPages]) => (
              <div key={dateStr}>
                <div className="sticky top-14 z-[9] bg-surface-50 py-2">
                  <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
                    {formatDate(dayPages[0].last_seen_at)}
                    <Badge className="ml-2">{dayPages.length} pages</Badge>
                  </h2>
                </div>

                <div className="space-y-1 mt-2">
                  {dayPages.map((page) => (
                    <TimelineItem key={page.id} page={page} />
                  ))}
                </div>
              </div>
            ))}

            {pages && pages.length >= limit && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setLimit((l) => l + 100)}
                >
                  <ChevronDown className="h-4 w-4" />
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineItem({ page }: { page: Page }) {
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (page.id) await pagesRepo.deletePage(page.id);
  };

  return (
    <div className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white hover:shadow-sm transition-all">
      <span className="text-xs text-surface-400 font-mono shrink-0 w-12">
        {formatTime(page.last_seen_at)}
      </span>

      {page.favicon ? (
        <img
          src={page.favicon}
          alt=""
          className="h-4 w-4 rounded-sm shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <Globe className="h-4 w-4 text-surface-300 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-800 truncate">
          {page.title || page.url}
        </p>
        <p className="text-xs text-surface-400 truncate">{page.domain}</p>
      </div>

      {page.total_dwell_time > 0 && (
        <span className="flex items-center gap-1 text-xs text-surface-400">
          <Clock className="h-3 w-3" />
          {formatDuration(page.total_dwell_time)}
        </span>
      )}

      <button
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-surface-400 hover:text-error transition-all"
        title="Delete page"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
