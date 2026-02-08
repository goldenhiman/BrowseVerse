import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { EmptyState } from '../components/shared/EmptyState';
import { useAllKnowledgeBoxes } from '../hooks/useKnowledgeBoxes';
import { knowledgeBoxesRepo } from '../../db/repositories/knowledgeBoxes';
import type { KnowledgeBoxStatus } from '../../shared/types';
import {
  Orbit,
  Plus,
  Target,
  Calendar,
  FileText,
  Pause,
  CheckCircle2,
  X,
} from 'lucide-react';

const statusConfig: Record<
  KnowledgeBoxStatus,
  { label: string; variant: 'success' | 'warning' | 'default'; icon: React.ReactNode }
> = {
  active: { label: 'Active', variant: 'success', icon: <Target className="h-3 w-3" /> },
  paused: { label: 'Paused', variant: 'warning', icon: <Pause className="h-3 w-3" /> },
  completed: {
    label: 'Completed',
    variant: 'default',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
};

export default function Constellations() {
  const boxes = useAllKnowledgeBoxes();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGoal, setNewGoal] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const now = Date.now();
    const id = await knowledgeBoxesRepo.create({
      title: newTitle.trim(),
      goal_statement: newGoal.trim(),
      start_date: now,
      related_page_ids: [],
      related_topic_ids: [],
      notes: [],
      status: 'active',
      created_at: now,
      updated_at: now,
    });
    setNewTitle('');
    setNewGoal('');
    setShowCreate(false);
    navigate(`/constellations/${id}`);
  };

  return (
    <div>
      <Header
        title="Constellations"
        subtitle="Your personal mini-verses around topics and goals"
        actions={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-3.5 w-3.5" />
            New Constellation
          </Button>
        }
      />

      <div className="p-6">
        {/* Create modal */}
        {showCreate && (
          <Card className="mb-6 shadow-[0_0_0_1px_var(--color-primary-200),0_1px_3px_rgba(0,0,0,0.04)] bg-primary-50/30 animate-fade-in">
            <form
              onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-surface-900">
                  Create Constellation
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  aria-label="Close create form"
                  className="p-1 rounded text-surface-400 hover:text-surface-600 transition-[color] duration-150 ease-[var(--ease-out-cubic)] min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <Input
                label="Title"
                placeholder="e.g., Job Search, Learning React, PhD Research\u2026"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
              <Input
                label="Goal"
                placeholder="What are you trying to achieve?"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!newTitle.trim()}>
                  Create
                </Button>
              </div>
            </form>
          </Card>
        )}

        {!boxes || boxes.length === 0 ? (
          <EmptyState
            icon={<Orbit className="h-12 w-12" />}
            title="No constellations yet"
            description="Create a constellation to start building a mini-verse around your topic or goal"
            action={
              <Button onClick={() => setShowCreate(true)} size="sm">
                <Plus className="h-3.5 w-3.5" />
                Create your first constellation
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boxes.map((box) => {
              const status = statusConfig[box.status];
              return (
                <Card
                  key={box.id}
                  hover
                  onClick={() => navigate(`/constellations/${box.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                      <Orbit className="h-4 w-4 text-primary-600" />
                    </div>
                    <Badge variant={status.variant}>
                      <span className="flex items-center gap-1">
                        {status.icon}
                        {status.label}
                      </span>
                    </Badge>
                  </div>

                  <h3 className="text-sm font-semibold text-surface-900 mb-1">
                    {box.title}
                  </h3>
                  {box.goal_statement && (
                    <p className="text-xs text-surface-500 mb-3 line-clamp-2">
                      {box.goal_statement}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-surface-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(box.start_date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {box.related_page_ids.length} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {box.notes.length} notes
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
