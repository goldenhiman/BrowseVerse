/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import React, { useState, useEffect, useCallback } from 'react';

// File System Access API type augmentation (not yet in all TS libs)
declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
  }
}
import { Header } from '../components/layout/Header';
import { Card, CardHeader, CardTitle } from '../components/shared/Card';
import { Switch } from '../components/shared/Switch';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { Badge } from '../components/shared/Badge';
import {
  loadSettings,
  saveSettings,
} from '../../privacy/exclusions';
import { PRESET_EXCLUSIONS } from '../../shared/preset-exclusions';
import { ExclusionManageModal } from '../components/ExclusionManageModal';
import { AutoBackupSetupModal } from '../components/settings/AutoBackupSetupModal';
import { ChangeEncryptionPasswordModal } from '../components/settings/ChangeEncryptionPasswordModal';
import { ExportModal } from '../components/settings/ExportModal';
import { ImportModal } from '../components/settings/ImportModal';
import { deleteAllData, deleteByDomain } from '../../privacy/deletion';
import {
  storeBackupDirHandle,
  getBackupDirName,
  clearBackupDirHandle,
} from '../../privacy/auto-backup';
import { LAST_AUTO_BACKUP_KEY } from '../../shared/constants';
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
  FolderOpen,
  HardDrive,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showDanger, setShowDanger] = useState(false);
  const [showExclusionModal, setShowExclusionModal] = useState(false);

  // AI connection status
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'disconnected'>('idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [testingProviderIndex, setTestingProviderIndex] = useState<number | null>(null);

  // Export/Import modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Auto-backup state
  const [backupDirName, setBackupDirName] = useState<string | null>(null);
  const [lastAutoBackup, setLastAutoBackup] = useState<number | null>(null);
  const [showAutoBackupSetupModal, setShowAutoBackupSetupModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);


  useEffect(() => {
    loadSettings().then((s) => setSettings(s));
    // Load backup directory name and last-backup timestamp
    getBackupDirName().then(setBackupDirName);
    browser.storage.local.get(LAST_AUTO_BACKUP_KEY).then((r) => {
      const val = r[LAST_AUTO_BACKUP_KEY];
      setLastAutoBackup(typeof val === 'number' ? val : null);
    });
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

  const handleImportComplete = async () => {
    const freshSettings = await loadSettings();
    setSettings(freshSettings);
  };

  const handleChooseBackupFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      await storeBackupDirHandle(handle);
      setBackupDirName(handle.name);
    } catch {
      // User cancelled the picker — do nothing
    }
  };

  const handleClearBackupFolder = async () => {
    await clearBackupDirHandle();
    setBackupDirName(null);
  };

  const autoBackupConfigured = !!(settings?.auto_backup_enabled && backupDirName);

  const handleAutoBackupToggle = async (enabled: boolean) => {
    if (!settings) return;
    if (enabled) {
      if (backupDirName) {
        await updateSetting('auto_backup_enabled', true);
      } else {
        setShowAutoBackupSetupModal(true);
      }
    } else {
      await updateSetting('auto_backup_enabled', false);
    }
  };

  const handleAutoBackupSetupComplete = async (data: {
    folderHandle: FileSystemDirectoryHandle;
    encryptionPassword?: string;
  }) => {
    await storeBackupDirHandle(data.folderHandle);
    setBackupDirName(data.folderHandle.name);
    await updateSetting('backup_encryption_password', data.encryptionPassword);
    await updateSetting('auto_backup_enabled', true);
  };

  const handleChangeEncryptionPassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    if (!settings?.backup_encryption_password) return;
    if (currentPassword !== settings.backup_encryption_password) {
      throw new Error('Current password is incorrect.');
    }
    await updateSetting('backup_encryption_password', newPassword);
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

        {/* Auto-Backup & Encryption */}
        <Card>
          <CardHeader>
            <div className="flex-1 min-w-0">
              <CardTitle>
                <span className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-emerald-500" />
                  Auto-Backup &amp; Encryption
                </span>
              </CardTitle>
              <p className="text-xs text-surface-500 mt-1">
                Automatically save a daily backup to a folder on your computer. Set an encryption
                password to protect all exports (manual and automatic).
              </p>
            </div>
            <label className="shrink-0 flex items-center gap-2 cursor-pointer select-none ml-4">
              <Switch
                checked={!!settings.auto_backup_enabled}
                onCheckedChange={handleAutoBackupToggle}
              />
              <span className="text-sm text-surface-700">Enable</span>
            </label>
          </CardHeader>

          {autoBackupConfigured && (
            <div className="space-y-4 pt-2 border-t border-surface-200">
              <div>
                <label className="text-xs font-medium text-surface-600 mb-1.5 block">
                  Backup Folder
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg bg-surface-50 border border-surface-200 px-3 py-1.5 flex-1 min-w-0">
                    <FolderOpen className="h-3.5 w-3.5 text-surface-500 shrink-0" />
                    <span className="text-sm text-surface-700 truncate">{backupDirName}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleChooseBackupFolder}>
                    Change
                  </Button>
                </div>
              </div>

              {settings.backup_encryption_password && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Encrypted
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChangePasswordModal(true)}
                  >
                    Change password
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-surface-500">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Last auto-backup:{' '}
                  {lastAutoBackup ? (
                    <strong className="text-surface-700">
                      {new Date(lastAutoBackup).toLocaleString()}
                    </strong>
                  ) : (
                    'Never'
                  )}
                </span>
              </div>
            </div>
          )}
        </Card>

        <AutoBackupSetupModal
          isOpen={showAutoBackupSetupModal}
          onClose={() => setShowAutoBackupSetupModal(false)}
          onComplete={handleAutoBackupSetupComplete}
        />

        <ChangeEncryptionPasswordModal
          isOpen={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={() => {}}
          onUpdatePassword={handleChangeEncryptionPassword}
        />

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
          <p className="text-xs text-surface-500 mb-4">
            Export your data in various formats, or import a previous backup to restore everything.
            Your data is always yours.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowExportModal(true)}>
              <Download className="h-3 w-3" /> Export
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
              <Upload className="h-3 w-3" /> Import
            </Button>
          </div>
        </Card>

        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
        />

        <ImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImportComplete={handleImportComplete}
        />

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
