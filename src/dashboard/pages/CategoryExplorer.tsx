import React, { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Card, CardHeader, CardTitle } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { EmptyState } from '../components/shared/EmptyState';
import { useAllCategories } from '../hooks/useCategories';
import { useAllTopics } from '../hooks/useTopics';
import { useRecentPages } from '../hooks/usePages';
import {
  Layers,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Tag,
} from 'lucide-react';
import type { Category, Topic, CategoryTrend, TopicLifecycle } from '../../shared/types';

const trendIcons: Record<CategoryTrend, React.ReactNode> = {
  up: <TrendingUp className="h-3.5 w-3.5 text-green-500" />,
  flat: <Minus className="h-3.5 w-3.5 text-surface-400" />,
  down: <TrendingDown className="h-3.5 w-3.5 text-amber-500" />,
};

const trendLabels: Record<CategoryTrend, { text: string; variant: 'success' | 'default' | 'warning' }> = {
  up: { text: 'Growing', variant: 'success' },
  flat: { text: 'Stable', variant: 'default' },
  down: { text: 'Declining', variant: 'warning' },
};

const lifecycleVariants: Record<TopicLifecycle, 'primary' | 'success' | 'default'> = {
  emerging: 'primary',
  active: 'success',
  dormant: 'default',
};

export default function CategoryExplorer() {
  const categories = useAllCategories();
  const topics = useAllTopics();
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  const getTopicsForCategory = (category: Category): Topic[] => {
    if (!topics) return [];
    return topics.filter((t) => category.topic_ids.includes(t.id!));
  };

  return (
    <div>
      <Header
        title="Categories"
        subtitle="High-level themes in your browsing"
      />

      <div className="p-6">
        {!categories || categories.length === 0 ? (
          <EmptyState
            icon={<Layers className="h-12 w-12" />}
            title="No categories yet"
            description="Categories are automatically generated as you browse. Keep exploring and they will appear here."
          />
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const catTopics = getTopicsForCategory(category);
              const isExpanded = expandedCategory === category.id;
              const trend = trendLabels[category.trend];
              const totalPages = catTopics.reduce(
                (sum, t) => sum + t.page_ids.length,
                0,
              );

              return (
                <Card key={category.id} className="overflow-hidden">
                  <button
                    onClick={() =>
                      setExpandedCategory(isExpanded ? null : category.id!)
                    }
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                          <Layers className="h-4 w-4 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-surface-900">
                            {category.name}
                          </h3>
                          <p className="text-xs text-surface-500">
                            {catTopics.length} topics &middot; {totalPages} pages
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          {trendIcons[category.trend]}
                          <Badge variant={trend.variant}>{trend.text}</Badge>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 text-surface-400 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Expanded topics list */}
                  {isExpanded && catTopics.length > 0 && (
                    <div className="mt-4 border-t border-surface-100 pt-4 space-y-2">
                      {category.description && (
                        <p className="text-xs text-surface-500 mb-3">
                          {category.description}
                        </p>
                      )}
                      {catTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="h-3.5 w-3.5 text-surface-400" />
                            <span className="text-sm text-surface-700">
                              {topic.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={lifecycleVariants[topic.lifecycle_state]}>
                              {topic.lifecycle_state}
                            </Badge>
                            <span className="text-xs text-surface-400">
                              {topic.page_ids.length} pages
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
