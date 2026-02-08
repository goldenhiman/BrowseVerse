import React, { useEffect, useState } from 'react';
import { Brain, Globe, Clock, ExternalLink, Layers, Activity } from 'lucide-react';
import type { StatsResponse } from '../../src/shared/messaging';

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export default function App() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    browser.runtime
      .sendMessage({ type: 'GET_STATS' })
      .then((response) => {
        setStats(response as StatsResponse);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openDashboard = () => {
    browser.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    window.close();
  };

  return (
    <div className="w-80 bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
          <Brain className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-gray-900">BrowseVerse</h1>
          <p className="text-[10px] text-gray-400">Personal knowledge system</p>
        </div>
        {stats?.active_session && (
          <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
          </span>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-600" />
        </div>
      ) : stats ? (
        <div className="px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-gray-50 p-2.5">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <Globe className="h-3 w-3" />
                <span className="text-[10px] font-medium">Pages Today</span>
              </div>
              <p className="text-lg font-bold text-gray-900">{stats.pages_today}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2.5">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <Clock className="h-3 w-3" />
                <span className="text-[10px] font-medium">Browse Time</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {formatDuration(stats.total_dwell_time_today)}
              </p>
            </div>
          </div>

          {/* Top Domains */}
          {stats.top_domains.length > 0 && (
            <div>
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Top Domains
              </h3>
              <div className="space-y-1">
                {stats.top_domains.slice(0, 3).map((d) => (
                  <div
                    key={d.domain}
                    className="flex items-center justify-between rounded px-2 py-1 text-xs"
                  >
                    <span className="text-gray-600 truncate max-w-[180px]">
                      {d.domain}
                    </span>
                    <span className="text-gray-400 font-medium">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session info */}
          <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2">
            <Activity className="h-3.5 w-3.5 text-indigo-500" />
            <span className="text-xs text-indigo-700">
              {stats.session_page_count} pages in current session
            </span>
          </div>
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-gray-400">Could not load stats</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <button
          onClick={openDashboard}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Open Dashboard
        </button>
      </div>
    </div>
  );
}
