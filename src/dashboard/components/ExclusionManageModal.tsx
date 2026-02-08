import React, { useState } from 'react';
import {
  loadSettings,
  saveSettings,
  addExcludedDomain,
  removeExcludedDomain,
  togglePreset,
} from '../../privacy/exclusions';
import { PRESET_EXCLUSIONS } from '../../shared/preset-exclusions';
import { Button } from './shared/Button';
import { Input } from './shared/Input';
import {
  X,
  Mail,
  FileText,
  Landmark,
  Shield,
  Key,
  ChevronDown,
  ChevronRight,
  Plus,
} from 'lucide-react';
import type { AppSettings } from '../../shared/types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Mail,
  FileText,
  Landmark,
  Shield,
  Key,
};

interface ExclusionManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export function ExclusionManageModal({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: ExclusionManageModalProps) {
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState('');

  const presetIds = settings.excluded_preset_ids ?? [];
  const userDomains = settings.excluded_domains.filter(
    (d) => !PRESET_EXCLUSIONS.some((p) => p.domains.includes(d)),
  );

  const refreshSettings = async () => {
    const s = await loadSettings();
    onSettingsChange(s);
  };

  const handleTogglePreset = async (presetId: string, enabled: boolean) => {
    await togglePreset(presetId, enabled);
    await refreshSettings();
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) return;
    await addExcludedDomain(newDomain.trim());
    setNewDomain('');
    await refreshSettings();
  };

  const handleRemoveDomain = async (domain: string) => {
    await removeExcludedDomain(domain);
    await refreshSettings();
  };

  if (!isOpen) return null;

  const totalExcluded = settings.excluded_domains.length;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exclusion-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_20px_50px_rgba(0,0,0,0.15)] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <h2 id="exclusion-modal-title" className="text-base font-semibold text-surface-900">
            Manage Exclusions
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-[color,background] duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-140px)] px-5 py-4 space-y-4">
          <p className="text-xs text-surface-500">
            Pages from excluded domains are not captured. Toggle categories or add custom domains.
          </p>

          {/* Preset categories */}
          <div className="space-y-2">
            {PRESET_EXCLUSIONS.map((preset) => {
              const Icon = ICON_MAP[preset.icon] ?? Shield;
              const isEnabled = presetIds.includes(preset.id);
              const isExpanded = expandedPreset === preset.id;

              return (
                <div
                  key={preset.id}
                  className="rounded-lg shadow-[0_0_0_1px_rgba(0,0,0,0.06)] overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-50/50">
                    <button
                      type="button"
                      onClick={() => setExpandedPreset(isExpanded ? null : preset.id)}
                      className="p-1 rounded text-surface-500 hover:text-surface-700 transition-[color] duration-150"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    <label className="flex flex-1 items-center gap-2 cursor-pointer min-w-0">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => handleTogglePreset(preset.id, e.target.checked)}
                        className="rounded border-surface-300 h-4 w-4 shrink-0"
                      />
                      <Icon className="h-4 w-4 text-surface-500 shrink-0" />
                      <span className="text-sm font-medium text-surface-800 truncate">
                        {preset.label}
                      </span>
                      <span className="text-xs text-surface-400 shrink-0">
                        ({preset.domains.length} domains)
                      </span>
                    </label>
                  </div>

                  {isExpanded && (
                    <div className="px-3 py-2 border-t border-surface-200 bg-white">
                      <p className="text-xs text-surface-500 mb-2">{preset.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {preset.domains.map((d) => (
                          <span
                            key={d}
                            className="inline-flex items-center rounded-md bg-surface-100 px-2 py-0.5 text-xs text-surface-600"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom domains */}
          <div className="pt-2 border-t border-surface-200">
            <h3 className="text-xs font-medium text-surface-700 mb-2">Custom domains</h3>
            <form
              onSubmit={(e) => { e.preventDefault(); handleAddDomain(); }}
              className="flex gap-2 mb-3"
            >
              <Input
                placeholder="e.g., mybank.example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="sm" disabled={!newDomain.trim()}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </form>
            {userDomains.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {userDomains.map((domain) => (
                  <span
                    key={domain}
                    className="flex items-center gap-1.5 rounded-md bg-surface-100 px-2.5 py-1 text-xs text-surface-600"
                  >
                    {domain}
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(domain)}
                      aria-label={`Remove ${domain}`}
                      className="text-surface-400 hover:text-error transition-[color] duration-150"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-surface-400">No custom domains</p>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-surface-200 bg-surface-50/50">
          <p className="text-xs text-surface-500">
            <strong>{totalExcluded}</strong> domain{totalExcluded !== 1 ? 's' : ''} excluded
          </p>
        </div>
      </div>
    </div>
  );
}
