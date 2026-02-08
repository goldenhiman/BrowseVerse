import React from 'react';
import { Header } from '../components/layout/Header';
import { Card, CardHeader, CardTitle } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { EmptyState } from '../components/shared/EmptyState';
import {
  usePagesToday,
  usePageCount,
  useTopDomains,
  useTotalDwellTimeToday,
  useRecentPages,
} from '../hooks/usePages';
import { useCurrentSession, useSessionCount } from '../hooks/useSessions';
import { useAllTopics } from '../hooks/useTopics';
import { useAllKnowledgeBoxes } from '../hooks/useKnowledgeBoxes';
import {
  Globe,
  Clock,
  Layers,
  Orbit,
  TrendingUp,
  Activity,
} from 'lucide-react';

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Overview() {
  const pagesToday = usePagesToday();
  const totalPages = usePageCount();
  const dwellTimeToday = useTotalDwellTimeToday();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const topDomains = useTopDomains(5, startOfDay.getTime());
  const currentSession = useCurrentSession();
  const sessionCount = useSessionCount();
  const recentPages = useRecentPages(10);
  const topics = useAllTopics();
  const knowledgeBoxes = useAllKnowledgeBoxes();

  const activeTopics = topics?.filter((t) => t.lifecycle_state === 'active') || [];
  const activeBoxes = knowledgeBoxes?.filter((b) => b.status === 'active') || [];

  return (
    <div>
      <Header
        title="Overview"
        subtitle="Your browsing knowledge at a glance"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<Globe className="h-4 w-4" />}
            label="Pages Today"
            value={pagesToday ?? 0}
            sublabel={`${totalPages ?? 0} total`}
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Time Today"
            value={formatDuration(dwellTimeToday ?? 0)}
            sublabel={currentSession ? 'Session active' : 'No active session'}
          />
          <StatCard
            icon={<Layers className="h-4 w-4" />}
            label="Active Topics"
            value={activeTopics.length}
            sublabel={`${topics?.length ?? 0} total topics`}
          />
          <StatCard
            icon={<Orbit className="h-4 w-4" />}
            label="Constellations"
            value={activeBoxes.length}
            sublabel={`${knowledgeBoxes?.length ?? 0} total`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Domains */}
          <Card>
            <CardHeader>
              <CardTitle>Top Domains Today</CardTitle>
              <TrendingUp className="h-4 w-4 text-surface-400" />
            </CardHeader>
            {topDomains && topDomains.length > 0 ? (
              <div className="space-y-2">
                {topDomains.map((d, i) => (
                  <div
                    key={d.domain}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-surface-400 w-4">
                        {i + 1}
                      </span>
                      <span className="text-sm text-surface-700 truncate max-w-[200px]">
                        {d.domain}
                      </span>
                    </div>
                    <Badge>{d.count} pages</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No browsing data yet"
                description="Start browsing to see your top domains"
              />
            )}
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <Activity className="h-4 w-4 text-surface-400" />
            </CardHeader>
            {recentPages && recentPages.length > 0 ? (
              <div className="space-y-2">
                {recentPages.slice(0, 8).map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center gap-3 py-1"
                  >
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
                      <p className="text-sm text-surface-700 truncate">
                        {page.title || page.url}
                      </p>
                      <p className="text-xs text-surface-400 truncate">
                        {page.domain}
                      </p>
                    </div>
                    <span className="text-xs text-surface-400 shrink-0">
                      {formatTimeAgo(page.last_seen_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No recent activity"
                description="Your browsing activity will appear here"
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-surface-500 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-surface-900">{value}</p>
      <p className="text-xs text-surface-400 mt-1">{sublabel}</p>
    </Card>
  );
}
