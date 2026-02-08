// ============================================================
// Domain & URL Exclusion System
// ============================================================

import { EXCLUSIONS_PRESETS_VERSION, SETTINGS_STORAGE_KEY, SYSTEM_EXCLUDED_PATTERNS } from '../shared/constants';
import {
  DEFAULT_PRESET_IDS,
  getDomainsFromPresets,
  PRESET_EXCLUSIONS,
} from '../shared/preset-exclusions';
import type { AppSettings, AIProviderConfig } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

const PRESETS_VERSION_KEY = 'bko_exclusions_presets_version';

let cachedSettings: AppSettings | null = null;

/** Migrate legacy single-provider settings to ai_providers list */
function migrateLegacyAIProviders(settings: AppSettings): AppSettings {
  if (settings.ai_providers && settings.ai_providers.length > 0) return settings;
  if (!settings.ai_provider || !settings.ai_api_key) return settings;
  const config: AIProviderConfig = {
    provider: settings.ai_provider,
    api_key: settings.ai_api_key,
    model: settings.ai_model,
    custom_model: settings.ai_custom_model,
  };
  return { ...settings, ai_providers: [config] };
}

async function getSettings(): Promise<AppSettings> {
  if (cachedSettings) return cachedSettings;

  try {
    const result = await browser.storage.local.get([SETTINGS_STORAGE_KEY, PRESETS_VERSION_KEY]);
    let settings: AppSettings = result[SETTINGS_STORAGE_KEY] || { ...DEFAULT_SETTINGS };
    const version = result[PRESETS_VERSION_KEY];

    if (version !== EXCLUSIONS_PRESETS_VERSION) {
      settings = await migratePresets(settings);
      await browser.storage.local.set({ [PRESETS_VERSION_KEY]: EXCLUSIONS_PRESETS_VERSION });
    }

    settings = migrateLegacyAIProviders(settings);
    cachedSettings = settings;
    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function migratePresets(settings: AppSettings): Promise<AppSettings> {
  if (settings.excluded_preset_ids !== undefined) {
    return settings;
  }

  if (settings.excluded_domains.length === 0) {
    const presetIds = DEFAULT_PRESET_IDS;
    const domains = getDomainsFromPresets(presetIds);
    return { ...settings, excluded_preset_ids: presetIds, excluded_domains: domains };
  }

  return { ...settings, excluded_preset_ids: [] };
}

export async function isExcluded(url: string): Promise<boolean> {
  // Always exclude system URLs
  if (SYSTEM_EXCLUDED_PATTERNS.some((pattern) => url.startsWith(pattern))) {
    return true;
  }

  try {
    const settings = await getSettings();
    const domain = new URL(url).hostname;

    // Check domain exclusions
    if (settings.excluded_domains.some((d) => domain === d || domain.endsWith('.' + d))) {
      return true;
    }

    // Check URL pattern exclusions
    if (settings.excluded_url_patterns.some((pattern) => url.includes(pattern))) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function addExcludedDomain(domain: string): Promise<void> {
  const settings = await getSettings();
  if (!settings.excluded_domains.includes(domain)) {
    settings.excluded_domains.push(domain);
    await saveSettings(settings);
  }
}

export async function removeExcludedDomain(domain: string): Promise<void> {
  const settings = await getSettings();
  settings.excluded_domains = settings.excluded_domains.filter((d) => d !== domain);
  await saveSettings(settings);
}

export async function addExcludedPattern(pattern: string): Promise<void> {
  const settings = await getSettings();
  if (!settings.excluded_url_patterns.includes(pattern)) {
    settings.excluded_url_patterns.push(pattern);
    await saveSettings(settings);
  }
}

export async function removeExcludedPattern(pattern: string): Promise<void> {
  const settings = await getSettings();
  settings.excluded_url_patterns = settings.excluded_url_patterns.filter((p) => p !== pattern);
  await saveSettings(settings);
}

export async function getExcludedDomains(): Promise<string[]> {
  const settings = await getSettings();
  return settings.excluded_domains;
}

export async function getExcludedPatterns(): Promise<string[]> {
  const settings = await getSettings();
  return settings.excluded_url_patterns;
}

/** Toggle a preset category on or off */
export async function togglePreset(presetId: string, enabled: boolean): Promise<void> {
  const settings = await getSettings();
  const presetIds = settings.excluded_preset_ids ?? [];
  const preset = PRESET_EXCLUSIONS.find((p) => p.id === presetId);
  if (!preset) return;

  let newPresetIds: string[];
  if (enabled) {
    newPresetIds = presetIds.includes(presetId) ? presetIds : [...presetIds, presetId];
  } else {
    newPresetIds = presetIds.filter((id) => id !== presetId);
  }

  const presetDomains = getDomainsFromPresets(newPresetIds);
  const userDomains = settings.excluded_domains.filter(
    (d) => !PRESET_EXCLUSIONS.some((p) => p.domains.includes(d)),
  );
  const newDomains = [...new Set([...presetDomains, ...userDomains])];

  const updated = { ...settings, excluded_preset_ids: newPresetIds, excluded_domains: newDomains };
  await saveSettings(updated);
}

export async function loadSettings(): Promise<AppSettings> {
  return getSettings();
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  cachedSettings = settings;
  await browser.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });
}

export function invalidateCache(): void {
  cachedSettings = null;
}

// Listen for settings changes from other contexts
if (typeof browser !== 'undefined' && browser.storage?.onChanged) {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[SETTINGS_STORAGE_KEY]) {
      cachedSettings = changes[SETTINGS_STORAGE_KEY].newValue || null;
    }
  });
}
