import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Card } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { Badge } from '../components/shared/Badge';
import { EmptyState } from '../components/shared/EmptyState';
import { ArtifactViewer } from '../components/nebula/ArtifactViewer';
import { useNebulaById } from '../hooks/useNebulas';
import { useRunsByNebula } from '../hooks/useNebulaRuns';
import { useArtifactByRun } from '../hooks/useArtifacts';
import { executeNebula, type ExecutionCallbacks } from '../../ai/tasks/nebula-executor';
import type { UserInputConfig, NebulaRunStatus } from '../../shared/types';
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Pencil,
  Sparkles,
} from 'lucide-react';

type Phase = 'input' | 'running' | 'complete' | 'error';

const statusConfig: Record<
  NebulaRunStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'default'; icon: React.ReactNode }
> = {
  pending: { label: 'Pending', variant: 'default', icon: <Clock className="h-3 w-3" /> },
  running: { label: 'Running', variant: 'warning', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { label: 'Completed', variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: 'Failed', variant: 'error', icon: <XCircle className="h-3 w-3" /> },
};

export default function NebulaRunner() {
  const { id } = useParams<{ id: string }>();
  const nebulaId = id ? parseInt(id, 10) : undefined;
  const nebula = useNebulaById(nebulaId);
  const runs = useRunsByNebula(nebulaId);
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('input');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [currentNode, setCurrentNode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [completedRunId, setCompletedRunId] = useState<number | null>(null);
  const [selectedHistoryRunId, setSelectedHistoryRunId] = useState<number | null>(null);

  // Determine which run ID to show the artifact for
  const activeRunId = selectedHistoryRunId ?? completedRunId;
  const artifact = useArtifactByRun(activeRunId ?? undefined);

  // Get user-input nodes from the nebula
  const inputNodes = nebula
    ? nebula.nodes
        .filter((n) => n.type === 'user-input')
        .map((n) => ({ id: n.id, config: n.data as UserInputConfig }))
    : [];

  const handleInputChange = (nodeId: string, value: string) => {
    setInputs((prev) => ({ ...prev, [nodeId]: value }));
  };

  const handleRun = useCallback(async () => {
    if (!nebula) return;

    // Validate required inputs
    for (const node of inputNodes) {
      if (node.config.required && !inputs[node.id]?.trim()) {
        setErrorMessage(`"${node.config.label}" is required`);
        return;
      }
    }

    setPhase('running');
    setErrorMessage('');
    setCurrentNode('Starting...');
    setCompletedRunId(null);
    setSelectedHistoryRunId(null);

    const callbacks: ExecutionCallbacks = {
      onNodeStart: (_nodeId, label) => setCurrentNode(`Processing: ${label}`),
      onNodeComplete: (_nodeId, label) => setCurrentNode(`Completed: ${label}`),
      onError: (_nodeId, error) => setCurrentNode(`Error: ${error}`),
    };

    try {
      const runId = await executeNebula(nebula, inputs, callbacks);
      setCompletedRunId(runId);
      setPhase('complete');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Execution failed');
      setPhase('error');
    }
  }, [nebula, inputs, inputNodes]);

  const handleReset = () => {
    setPhase('input');
    setErrorMessage('');
    setCurrentNode('');
    setCompletedRunId(null);
    setSelectedHistoryRunId(null);
  };

  if (!nebula) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-surface-400">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={`Run: ${nebula.name}`}
        subtitle={nebula.description}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/nebulas/${nebulaId}/edit`)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/nebulas')}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Input Phase */}
            {phase === 'input' && (
              <Card>
                <h3 className="text-sm font-semibold text-surface-900 mb-4">Inputs</h3>
                {inputNodes.length === 0 ? (
                  <p className="text-xs text-surface-500">
                    This nebula has no user inputs. Click Run to execute.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {inputNodes.map((node) => {
                      const cfg = node.config;
                      if (cfg.input_type === 'textarea') {
                        return (
                          <div key={node.id} className="space-y-1.5">
                            <label className="text-xs font-medium text-surface-600">
                              {cfg.label}
                              {cfg.required && (
                                <span className="text-error ml-0.5">*</span>
                              )}
                            </label>
                            <textarea
                              value={inputs[node.id] || cfg.default_value || ''}
                              onChange={(e) => handleInputChange(node.id, e.target.value)}
                              placeholder={cfg.placeholder}
                              rows={3}
                              className="w-full rounded-lg bg-white px-3 py-2 text-sm text-surface-900 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] focus:shadow-[0_0_0_1px_var(--color-primary-400)] focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-[box-shadow] duration-150 resize-y"
                            />
                          </div>
                        );
                      }
                      if (cfg.input_type === 'select' && cfg.options) {
                        return (
                          <div key={node.id} className="space-y-1.5">
                            <label className="text-xs font-medium text-surface-600">
                              {cfg.label}
                              {cfg.required && (
                                <span className="text-error ml-0.5">*</span>
                              )}
                            </label>
                            <select
                              value={inputs[node.id] || cfg.default_value || ''}
                              onChange={(e) => handleInputChange(node.id, e.target.value)}
                              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 focus:border-primary-400 focus:outline-none"
                            >
                              <option value="">{cfg.placeholder || 'Select...'}</option>
                              {cfg.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      return (
                        <Input
                          key={node.id}
                          label={
                            cfg.label +
                            (cfg.required ? ' *' : '')
                          }
                          value={inputs[node.id] || cfg.default_value || ''}
                          onChange={(e) => handleInputChange(node.id, e.target.value)}
                          placeholder={cfg.placeholder}
                        />
                      );
                    })}
                  </div>
                )}

                {errorMessage && phase === 'input' && (
                  <p className="text-xs text-error mt-3">{errorMessage}</p>
                )}

                <div className="mt-4 flex justify-end">
                  <Button size="sm" onClick={handleRun}>
                    <Play className="h-3.5 w-3.5" />
                    Run Nebula
                  </Button>
                </div>
              </Card>
            )}

            {/* Running Phase */}
            {phase === 'running' && (
              <Card>
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 mb-4">
                    <Loader2 className="h-6 w-6 text-primary-600 animate-spin" />
                  </div>
                  <h3 className="text-sm font-semibold text-surface-900 mb-1">
                    Executing Nebula
                  </h3>
                  <p className="text-xs text-surface-500">{currentNode}</p>
                </div>
              </Card>
            )}

            {/* Error Phase */}
            {phase === 'error' && (
              <Card>
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 mb-4">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-surface-900 mb-1">
                    Execution Failed
                  </h3>
                  <p className="text-xs text-surface-500 max-w-md">{errorMessage}</p>
                  <Button variant="secondary" size="sm" onClick={handleReset} className="mt-4">
                    Try Again
                  </Button>
                </div>
              </Card>
            )}

            {/* Complete Phase / Artifact View */}
            {(phase === 'complete' || selectedHistoryRunId) && artifact && (
              <div>
                {phase === 'complete' && !selectedHistoryRunId && (
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-surface-700">
                        Run complete
                      </span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleReset}>
                      Run Again
                    </Button>
                  </div>
                )}
                <ArtifactViewer artifact={artifact} />
              </div>
            )}
          </div>

          {/* Run History sidebar */}
          <div className="w-64 shrink-0">
            <Card>
              <h3 className="text-sm font-semibold text-surface-900 mb-3">Run History</h3>
              {!runs || runs.length === 0 ? (
                <p className="text-xs text-surface-400">No runs yet</p>
              ) : (
                <div className="space-y-2">
                  {runs.slice(0, 20).map((run) => {
                    const status = statusConfig[run.status];
                    const isSelected = run.id === selectedHistoryRunId;
                    return (
                      <button
                        key={run.id}
                        onClick={() => {
                          setSelectedHistoryRunId(
                            isSelected ? null : run.id ?? null,
                          );
                          if (!isSelected && run.status === 'completed') {
                            setPhase('complete');
                          }
                        }}
                        className={`w-full text-left rounded-lg px-3 py-2 transition-[background-color] duration-150 ${
                          isSelected
                            ? 'bg-primary-50'
                            : 'hover:bg-surface-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <Badge variant={status.variant}>
                            <span className="flex items-center gap-1">
                              {status.icon}
                              {status.label}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-[10px] text-surface-400">
                          {new Date(run.created_at).toLocaleString()}
                        </p>
                        {run.error && (
                          <p className="text-[10px] text-error mt-0.5 truncate">
                            {run.error}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
