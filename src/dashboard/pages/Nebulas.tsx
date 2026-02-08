import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card } from '../components/shared/Card';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { EmptyState } from '../components/shared/EmptyState';
import { useUserNebulas, useNebulaTemplates } from '../hooks/useNebulas';
import { useRecentRuns, type RecentRunRow } from '../hooks/useNebulaRuns';
import { nebulasRepo } from '../../db/repositories/nebulas';
import { seedNebulaTemplates } from '../../ai/tasks/nebula-templates';
import type { NebulaRunStatus } from '../../shared/types';
import {
  Sparkles,
  Plus,
  Play,
  Pencil,
  Clock,
  X,
  BookTemplate,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  ArrowRight,
} from 'lucide-react';

const statusConfig: Record<
  NebulaRunStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode }
> = {
  pending: { label: 'Pending', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  running: { label: 'Running', variant: 'warning', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: 'Completed', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: 'Failed', variant: 'error', icon: <XCircle className="h-3 w-3" /> },
};

export default function Nebulas() {
  const userNebulas = useUserNebulas();
  const templates = useNebulaTemplates();
  const recentRuns = useRecentRuns(20);
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState('🌀');

  // Seed templates on first visit
  useEffect(() => {
    seedNebulaTemplates();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const now = Date.now();
    const id = await nebulasRepo.create({
      name: newName.trim(),
      description: newDescription.trim(),
      icon: newIcon,
      nodes: [],
      edges: [],
      is_template: false,
      created_at: now,
      updated_at: now,
    });
    setNewName('');
    setNewDescription('');
    setNewIcon('🌀');
    setShowCreate(false);
    navigate(`/nebulas/${id}/edit`);
  };

  const handleUseTemplate = (templateId: number) => {
    // Navigate directly to the runner — no duplicate created
    navigate(`/nebulas/${templateId}/run`);
  };

  return (
    <div>
      <Header
        title="Nebulas"
        subtitle="Workflow pipelines that transform your browsing data into artifacts"
        actions={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-3.5 w-3.5" />
            New Nebula
          </Button>
        }
      />

      <div className="p-6 space-y-8">
        {/* Create modal */}
        {showCreate && (
          <Card className="shadow-[0_0_0_1px_var(--color-primary-200),0_1px_3px_rgba(0,0,0,0.04)] bg-primary-50/30 animate-fade-in">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-surface-900">
                  Create Nebula
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
              <div className="flex items-start gap-3">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1.5">Icon</label>
                  <input
                    type="text"
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-12 h-10 text-center text-lg rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.08)] focus:shadow-[0_0_0_1px_var(--color-primary-400)] focus:outline-none"
                    maxLength={2}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label="Name"
                    placeholder="e.g., Weekly Digest, Article Writer..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <Input
                label="Description"
                placeholder="What does this nebula produce?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={!newName.trim()}>
                  Create
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Templates gallery */}
        {templates && templates.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BookTemplate className="h-4 w-4 text-surface-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                Templates
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((tpl) => (
                <Card key={tpl.id} hover onClick={() => tpl.id && handleUseTemplate(tpl.id)}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl" role="img" aria-label={tpl.name}>
                      {tpl.icon}
                    </span>
                    <Badge variant="primary">Template</Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-surface-900 mb-1">{tpl.name}</h3>
                  <p className="text-xs text-surface-500 line-clamp-2">{tpl.description}</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-surface-400">
                    <Play className="h-3 w-3" />
                    <span>Click to run</span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Recent Runs */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-surface-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
              Recent Runs
            </h2>
          </div>

          {!recentRuns || recentRuns.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-12 w-12" />}
              title="No runs yet"
              description="Run a template or create a custom nebula to generate your first artifact"
              className="py-10"
            />
          ) : (
            <div className="space-y-2">
              {recentRuns.map((row: RecentRunRow) => {
                const status = statusConfig[row.run.status];
                return (
                  <div
                    key={row.run.id}
                    onClick={() => {
                      if (row.run.nebula_id) {
                        navigate(`/nebulas/${row.run.nebula_id}/run`);
                      }
                    }}
                    className="flex items-center gap-4 rounded-xl bg-white px-4 py-3 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.08)] transition-[box-shadow] duration-150 ease-[var(--ease-out-cubic)]"
                  >
                    {/* Icon */}
                    <span className="text-xl shrink-0" role="img">
                      {row.nebula?.icon || '🌀'}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-surface-900 truncate">
                          {row.nebula?.name || `Nebula #${row.run.nebula_id}`}
                        </span>
                        {row.nebula?.is_template && (
                          <Badge variant="primary" className="shrink-0">Template</Badge>
                        )}
                      </div>
                      {row.artifact ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-surface-500">
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">{row.artifact.title}</span>
                        </div>
                      ) : row.run.error ? (
                        <p className="text-[11px] text-error truncate">{row.run.error}</p>
                      ) : (
                        <p className="text-[11px] text-surface-400">Processing...</p>
                      )}
                    </div>

                    {/* Status */}
                    <Badge variant={status.variant} className="shrink-0">
                      <span className="flex items-center gap-1">
                        {status.icon}
                        {status.label}
                      </span>
                    </Badge>

                    {/* Timestamp */}
                    <span className="text-[10px] text-surface-400 shrink-0 w-28 text-right">
                      {new Date(row.run.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    <ArrowRight className="h-3.5 w-3.5 text-surface-300 shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Custom Nebulas */}
        {userNebulas && userNebulas.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-surface-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                Custom Nebulas
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userNebulas.map((nebula) => (
                <Card key={nebula.id} hover onClick={() => navigate(`/nebulas/${nebula.id}/edit`)}>
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-2xl" role="img" aria-label={nebula.name}>
                      {nebula.icon}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/nebulas/${nebula.id}/run`);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 transition-[background-color] duration-150"
                        aria-label="Run nebula"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/nebulas/${nebula.id}/edit`);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-50 text-surface-500 hover:bg-surface-100 transition-[background-color] duration-150"
                        aria-label="Edit nebula"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-surface-900 mb-1">{nebula.name}</h3>
                  {nebula.description && (
                    <p className="text-xs text-surface-500 mb-3 line-clamp-2">
                      {nebula.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-surface-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(nebula.updated_at).toLocaleDateString()}
                    </span>
                    <span>{nebula.nodes.length} nodes</span>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
