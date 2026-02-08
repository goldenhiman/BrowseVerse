import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '../components/layout/Header';
import { Card, CardHeader, CardTitle } from '../components/shared/Card';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { Badge } from '../components/shared/Badge';
import {
  loadSettings,
  saveSettings,
} from '../../privacy/exclusions';
import { PRESET_EXCLUSIONS } from '../../shared/preset-exclusions';
import { ExclusionManageModal } from '../components/ExclusionManageModal';
import { deleteAllData, deleteByDomain } from '../../privacy/deletion';
import {
  exportAsJSON,
  exportPagesAsCSV,
  exportHighlightsAsCSV,
  downloadFile,
  validateExportFile,
  importFromJSON,
} from '../../privacy/export';
import type { ImportPreview } from '../../privacy/export';
import { testAIConnection, testProviderConfig, clearAICache } from '../../ai/manager';
import type { AppSettings, AIProviderType, AIProviderConfig } from '../../shared/types';
import { AI_PROVIDER_MODELS } from '../../shared/types';
import {
  Shield,
  Download,
  Upload,
  Trash2,
  Key,
  Palette,
  Brain,
  AlertTriangle,
  Lock,
  Wifi,
  WifiOff,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  CheckCircle2,
} from 'lucide-react';

/** Human-friendly labels for export table keys */
const TABLE_LABELS: Record<string, string> = {
  pages: 'Pages',
  sessions: 'Sessions',
  highlights: 'Highlights',
  topics: 'Topics',
  categories: 'Categories',
  concepts: 'Concepts',
  relationships: 'Relationships',
  knowledgeBoxes: 'Constellations',
  documentChunks: 'Document Chunks',
  nebulas: 'Nebulas',
  nebulaRuns: 'Nebula Runs',
  artifacts: 'Artifacts',
};

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showDanger, setShowDanger] = useState(false);
  const [showExclusionModal, setShowExclusionModal] = useState(false);

  // AI connection status
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'disconnected'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [testingProviderIndex, setTestingProviderIndex] = useState<number | null>(null);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    loadSettings().then((s) => setSettings(s));
  }, []);

  // Auto-check connection when AI is enabled and has providers
  useEffect(() => {
    const hasProviders = (settings?.ai_providers?.length ?? 0) > 0 && settings?.ai_providers?.some((p) => p.api_key?.trim());
    if (settings?.ai_enabled && hasProviders) {
      checkConnection();
    } else {
      setConnectionStatus('idle');
    }
  }, [settings?.ai_enabled, settings?.ai_providers]);

  const checkConnection = useCallback(async () => {
    setConnectionStatus('checking');
    setConnectionError(null);
    clearAICache();
    const result = await testAIConnection();
    if (result.connected) {
      setConnectionStatus('connected');
    } else {
      setConnectionStatus('disconnected');
      setConnectionError(result.error || 'Connection failed');
    }
  }, []);

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
    clearAICache();
  };

  const handleExportJSON = async () => {
    const json = await exportAsJSON();
    downloadFile(json, `knowledge-os-export-${Date.now()}.json`, 'application/json');
  };

  const handleExportPagesCSV = async () => {
    const csv = await exportPagesAsCSV();
    downloadFile(csv, `knowledge-os-pages-${Date.now()}.csv`, 'text/csv');
  };

  const handleExportHighlightsCSV = async () => {
    const csv = await exportHighlightsAsCSV();
    downloadFile(csv, `knowledge-os-highlights-${Date.now()}.csv`, 'text/csv');
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset previous state
    setImportError(null);
    setImportSuccess(null);
    setImportPreview(null);
    setImportFileContent(null);

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = validateExportFile(text);
      if (!result.valid) {
        setImportError(result.error ?? 'Invalid export file.');
      } else {
        setImportPreview(result.preview!);
        setImportFileContent(text);
      }
    };
    reader.onerror = () => setImportError('Failed to read the selected file.');
    reader.readAsText(file);
    // Reset input so re-selecting the same file triggers onChange
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importFileContent) return;
    setImporting(true);
    setImportError(null);
    const result = await importFromJSON(importFileContent);
    setImporting(false);
    if (result.success) {
      setImportSuccess(result.counts);
      setImportPreview(null);
      setImportFileContent(null);
      // Reload settings from the imported data
      const freshSettings = await loadSettings();
      setSettings(freshSettings);
    } else {
      setImportError(result.error ?? 'Import failed.');
    }
  };

  const handleImportCancel = () => {
    setImportPreview(null);
    setImportFileContent(null);
    setImportError(null);
    setImportSuccess(null);
  };

  const handleDeleteAll = async () => {
    if (confirm('This will permanently delete ALL your data. Are you sure?')) {
      if (confirm('This cannot be undone. Type "DELETE" in the next prompt to confirm.')) {
        await deleteAllData();
        alert('All data has been deleted.');
      }
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword.trim()) {
      await updateSetting('dashboard_password', undefined);
    } else {
      await updateSetting('dashboard_password', newPassword.trim());
    }
    setNewPassword('');
  };

  const providers = settings?.ai_providers ?? [];

  const updateProvider = async (index: number, patch: Partial<AIProviderConfig>) => {
    if (!settings) return;
    const next = [...providers];
    next[index] = { ...next[index]!, ...patch };
    const updated = { ...settings, ai_providers: next };
    setSettings(updated);
    await saveSettings(updated);
    clearAICache();
  };

  const addProvider = async () => {
    if (!settings) return;
    const defaultConfig: AIProviderConfig = {
      provider: 'openai',
      api_key: '',
      model: AI_PROVIDER_MODELS.openai.models[0]?.id,
    };
    const next = [...providers, defaultConfig];
    const updated = { ...settings, ai_providers: next };
    setSettings(updated);
    await saveSettings(updated);
    clearAICache();
  };

  const removeProvider = async (index: number) => {
    if (!settings || providers.length <= 1) return;
    const next = providers.filter((_, i) => i !== index);
    const updated = { ...settings, ai_providers: next };
    setSettings(updated);
    await saveSettings(updated);
    clearAICache();
  };

  const moveProvider = async (index: number, direction: 'up' | 'down') => {
    if (!settings || providers.length < 2) return;
    const next = [...providers];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    const updated = { ...settings, ai_providers: next };
    setSettings(updated);
    await saveSettings(updated);
    clearAICache();
  };

  const handleTestProvider = async (index: number) => {
    const config = providers[index];
    if (!config) return;
    setTestingProviderIndex(index);
    const result = await testProviderConfig(config);
    setTestingProviderIndex(null);
    if (result.connected) {
      setConnectionStatus('connected');
      setConnectionError(null);
    } else {
      setConnectionStatus('disconnected');
      setConnectionError(result.error ?? 'Connection failed');
    }
  };

  if (!settings) {
    return (
      <div>
        <Header title="Settings" />
        <div className="flex items-center justify-center h-64">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-surface-200 border-t-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="m-auto">
      <Header title="Settings" subtitle="Privacy, data, and preferences" />

      <div className="p-6 max-w-3xl space-y-6 m-auto">
        {/* Domain Exclusions */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary-500" />
                Excluded Domains
              </span>
            </CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExclusionModal(true)}
            >
              Manage
            </Button>
          </CardHeader>
          <p className="text-xs text-surface-500 mb-2">
            Pages from excluded domains are not captured or stored.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-surface-700">
              <strong>{settings.excluded_domains.length}</strong> domain
              {settings.excluded_domains.length !== 1 ? 's' : ''} excluded
            </span>
            {settings.excluded_preset_ids && settings.excluded_preset_ids.length > 0 && (
              <>
                <span className="text-surface-400">·</span>
                <span className="text-xs text-surface-500">
                  {settings.excluded_preset_ids
                    .map((id) => PRESET_EXCLUSIONS.find((p) => p.id === id)?.label)
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </>
            )}
          </div>
        </Card>

        <ExclusionManageModal
          isOpen={showExclusionModal}
          onClose={() => setShowExclusionModal(false)}
          settings={settings}
          onSettingsChange={setSettings}
        />

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-500" />
                AI Integration
              </span>
            </CardTitle>

            {/* Connection Status Badge */}
            {settings.ai_enabled && (
              <div className="flex items-center gap-2">
                {connectionStatus === 'checking' && (
                  <Badge className="flex items-center gap-1.5 bg-blue-50 text-blue-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking...
                  </Badge>
                )}
                {connectionStatus === 'connected' && (
                  <Badge className="flex items-center gap-1.5 bg-green-50 text-green-700">
                    <Wifi className="h-3 w-3" />
                    Connected
                  </Badge>
                )}
                {connectionStatus === 'disconnected' && (
                  <Badge className="flex items-center gap-1.5 bg-red-50 text-red-700">
                    <WifiOff className="h-3 w-3" />
                    Disconnected
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <p className="text-xs text-surface-500 mb-3">
            AI features are optional and require your own API key. No data leaves your device
            without explicit action. Add multiple providers and order them by priority—if the primary
            hits a rate limit or fails, the next in line is used automatically.
          </p>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings.ai_enabled}
                onChange={(e) => updateSetting('ai_enabled', e.target.checked)}
                className="rounded border-surface-300 h-4 w-4"
              />
              <span className="text-sm text-surface-700">Enable AI features</span>
            </label>

            {settings.ai_enabled && (
              <>
                {/* Provider list */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-surface-600">
                      Providers (priority order—first is primary)
                    </label>
                    <Button variant="ghost" size="sm" onClick={addProvider}>
                      <Plus className="h-3 w-3" /> Add provider
                    </Button>
                  </div>

                  {providers.length === 0 && (
                    <p className="text-xs text-surface-500 py-2">
                      No providers configured. Add one to get started.
                    </p>
                  )}

                  {providers.map((config, index) => {
                    const providerModels = AI_PROVIDER_MODELS[config.provider];
                    const showCustom = config.model === undefined || !!config.custom_model;
                    return (
                      <div
                        key={index}
                        className="rounded-lg border border-surface-200 bg-surface-50/50 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-surface-500">
                            #{index + 1} {index === 0 ? '(primary)' : '(fallback)'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveProvider(index, 'up')}
                              disabled={index === 0}
                              aria-label={`Move provider ${index + 1} up`}
                              className="p-1 rounded text-surface-500 hover:bg-surface-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveProvider(index, 'down')}
                              disabled={index === providers.length - 1}
                              aria-label={`Move provider ${index + 1} down`}
                              className="p-1 rounded text-surface-500 hover:bg-surface-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProvider(index)}
                              disabled={providers.length <= 1}
                              aria-label={`Remove provider ${index + 1}`}
                              className="p-1 rounded text-surface-500 hover:bg-red-100 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-surface-600 mb-1.5 block">Provider</label>
                          <div className="flex gap-2 flex-wrap">
                            {(Object.entries(AI_PROVIDER_MODELS) as [AIProviderType, typeof AI_PROVIDER_MODELS[AIProviderType]][]).map(
                              ([key, cfg]) => (
                                <button
                                  key={key}
                                  onClick={() =>
                                    updateProvider(index, {
                                      provider: key,
                                      model: AI_PROVIDER_MODELS[key].models[0]?.id,
                                      custom_model: undefined,
                                    })
                                  }
                                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all border ${
                                    config.provider === key
                                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                                      : 'border-surface-200 text-surface-600 hover:border-surface-300'
                                  }`}
                                >
                                  {cfg.label}
                                </button>
                              ),
                            )}
                          </div>
                        </div>

                        <Input
                          label="API Key"
                          type="password"
                          placeholder={
                            config.provider === 'openai'
                              ? 'sk-...'
                              : config.provider === 'groq'
                                ? 'gsk_...'
                                : 'sk-ant-...'
                          }
                          value={config.api_key || ''}
                          onChange={(e) => updateProvider(index, { api_key: e.target.value })}
                        />

                        {providerModels && (
                          <div>
                            <label className="text-xs font-medium text-surface-600 mb-1.5 block">Model</label>
                            <div className="relative">
                              <select
                                value={showCustom ? '__custom__' : (config.model || providerModels.models[0]?.id)}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === '__custom__') {
                                    updateProvider(index, { model: undefined, custom_model: config.custom_model });
                                  } else {
                                    updateProvider(index, { model: v, custom_model: undefined });
                                  }
                                }}
                                className="w-full appearance-none rounded-lg bg-white px-3 py-2 pr-8 text-sm text-surface-700 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] focus:shadow-[0_0_0_1px_var(--color-primary-400)] focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                              >
                                {providerModels.models.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.label}
                                  </option>
                                ))}
                                <option value="__custom__">Custom model...</option>
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                            </div>
                          </div>
                        )}

                        {showCustom && (
                          <Input
                            label="Custom Model Name"
                            placeholder="e.g., gpt-4o-2024-11-20, claude-3-5-sonnet-20241022..."
                            value={config.custom_model || ''}
                            onChange={(e) =>
                              updateProvider(index, { custom_model: e.target.value || undefined })
                            }
                          />
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleTestProvider(index)}
                          disabled={testingProviderIndex === index || !config.api_key?.trim()}
                        >
                          {testingProviderIndex === index ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wifi className="h-3 w-3" />
                          )}
                          Test this provider
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Global connection status */}
                {connectionStatus === 'disconnected' && connectionError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 shadow-[0_0_0_1px_rgba(220,38,38,0.15)] px-3 py-2" role="alert">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-red-700">{connectionError}</p>
                      <button
                        type="button"
                        onClick={checkConnection}
                        className="text-xs text-red-600 font-medium hover:text-red-800 mt-1"
                      >
                        Retry connection
                      </button>
                    </div>
                  </div>
                )}

                {providers.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={checkConnection}
                    disabled={connectionStatus === 'checking' || !providers.some((p) => p.api_key?.trim())}
                  >
                    {connectionStatus === 'checking' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Wifi className="h-3 w-3" />
                    )}
                    Test primary connection
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Dashboard Lock */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                Dashboard Lock
              </span>
            </CardTitle>
          </CardHeader>
          <p className="text-xs text-surface-500 mb-3">
            Set a password to protect access to the dashboard.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); handleSetPassword(); }} className="flex gap-2">
            <Input
              type="password"
              placeholder={settings.dashboard_password ? 'Change password\u2026' : 'Set password\u2026'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="flex-1"
            />
            <Button type="submit" size="sm">
              {settings.dashboard_password ? 'Update' : 'Set'}
            </Button>
            {settings.dashboard_password && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateSetting('dashboard_password', undefined)}
              >
                Remove
              </Button>
            )}
          </form>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-pink-500" />
                Appearance
              </span>
            </CardTitle>
          </CardHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1.5 block">
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.accent_color}
                  onChange={(e) => updateSetting('accent_color', e.target.value)}
                  className="h-8 w-8 rounded border border-surface-200 cursor-pointer"
                />
                <span className="text-xs text-surface-500">{settings.accent_color}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-surface-600 mb-1.5 block">
                Session Idle Threshold
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={settings.session_idle_threshold_ms / 60000}
                  onChange={(e) =>
                    updateSetting(
                      'session_idle_threshold_ms',
                      parseInt(e.target.value) * 60000,
                    )
                  }
                  className="w-20"
                />
                <span className="text-xs text-surface-500">minutes</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Export & Import */}
        <Card>
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2">
                <Download className="h-4 w-4 text-blue-500" />
                Export &amp; Import Data
              </span>
            </CardTitle>
          </CardHeader>
          <p className="text-xs text-surface-500 mb-3">
            Export your data in various formats, or import a previous backup to restore everything.
            Your data is always yours.
          </p>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="secondary" size="sm" onClick={handleExportJSON}>
              <Download className="h-3 w-3" /> Export All (JSON)
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportPagesCSV}>
              <Download className="h-3 w-3" /> Pages (CSV)
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportHighlightsCSV}>
              <Download className="h-3 w-3" /> Highlights (CSV)
            </Button>
          </div>

          {/* Import section */}
          <div className="border-t border-surface-200 pt-4">
            <p className="text-xs font-medium text-surface-600 mb-2">Import</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFileSelect}
            />

            {!importPreview && !importSuccess && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-3 w-3" /> Import Data (JSON)
              </Button>
            )}

            {/* Validation error */}
            {importError && !importPreview && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 shadow-[0_0_0_1px_rgba(220,38,38,0.15)] px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-red-700">{importError}</p>
                  <button
                    type="button"
                    onClick={handleImportCancel}
                    className="text-xs text-red-600 font-medium hover:text-red-800 mt-1"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Import preview / confirmation */}
            {importPreview && (
              <div className="mt-3 rounded-lg border border-surface-200 bg-surface-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-surface-700">Import Preview</p>
                  <Badge className="bg-blue-50 text-blue-700 text-[10px]">
                    v{importPreview.version}
                  </Badge>
                </div>

                <p className="text-xs text-surface-500">
                  Exported on{' '}
                  <strong>{new Date(importPreview.exported_at).toLocaleString()}</strong>
                  {importPreview.hasSettings && ' — includes settings'}
                </p>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(importPreview.counts)
                    .filter(([, count]) => count > 0)
                    .map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-surface-600">{TABLE_LABELS[key] ?? key}</span>
                        <span className="font-medium text-surface-800">{count.toLocaleString()}</span>
                      </div>
                    ))}
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-amber-50 shadow-[0_0_0_1px_rgba(217,119,6,0.15)] px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800">
                    This will <strong>replace all existing data</strong>. Make sure you have a backup
                    if needed.
                  </p>
                </div>

                {importError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 shadow-[0_0_0_1px_rgba(220,38,38,0.15)] px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{importError}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleImportConfirm}
                    disabled={importing}
                  >
                    {importing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    {importing ? 'Importing...' : 'Import & Replace All Data'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleImportCancel} disabled={importing}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Import success */}
            {importSuccess && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-green-800">Import Successful</p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(importSuccess)
                    .filter(([, count]) => count > 0)
                    .map(([key, count]) => (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-green-700">{TABLE_LABELS[key] ?? key}</span>
                        <span className="font-medium text-green-900">{count.toLocaleString()}</span>
                      </div>
                    ))}
                </div>

                <Button variant="ghost" size="sm" onClick={handleImportCancel}>
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-error/20">
          <CardHeader>
            <CardTitle>
              <span className="flex items-center gap-2 text-error">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDanger(!showDanger)}
            >
              {showDanger ? 'Hide' : 'Show'}
            </Button>
          </CardHeader>

          {showDanger && (
            <div className="space-y-3">
              <p className="text-xs text-surface-500">
                These actions are irreversible. Please export your data before proceeding.
              </p>
              <Button variant="danger" size="sm" onClick={handleDeleteAll}>
                <Trash2 className="h-3 w-3" /> Delete All Data
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
