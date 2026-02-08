// ============================================================
// AI Manager - Creates and manages AI provider instances
// ============================================================

import type { AIProvider, CompletionOptions, ChatMessage } from './interface';
import type { AIProviderType, AIProviderConfig, AppSettings } from '../shared/types';
import { AI_PROVIDER_MODELS } from '../shared/types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GroqProvider } from './providers/groq';
import { loadSettings } from '../privacy/exclusions';

let cachedProvider: AIProvider | null = null;
let cachedConfigKey: string = '';

function createProviderFromConfig(config: AIProviderConfig): AIProvider | null {
  const effectiveModel = config.custom_model || config.model || undefined;
  const model = effectiveModel || getDefaultModel(config.provider);
  if (!config.api_key?.trim()) return null;
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.api_key, model);
    case 'anthropic':
      return new AnthropicProvider(config.api_key, model);
    case 'groq':
      return new GroqProvider(config.api_key, model);
    default:
      return null;
  }
}

function getDefaultModel(provider: AIProviderType): string {
  const models = AI_PROVIDER_MODELS[provider]?.models;
  return models?.[0]?.id || '';
}

/**
 * Provider that tries multiple AI providers in order, falling back on rate limit or failure.
 */
class FallbackAIProvider implements AIProvider {
  readonly name = 'Fallback';
  private providers: AIProvider[];

  constructor(providers: AIProvider[]) {
    this.providers = providers.filter((p) => p?.isConfigured?.());
  }

  isConfigured(): boolean {
    return this.providers.length > 0;
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    return this.runWithFallback((p) => p.complete(prompt, options));
  }

  async chat(messages: ChatMessage[], options?: CompletionOptions): Promise<string> {
    return this.runWithFallback((p) => p.chat(messages, options));
  }

  async embed(texts: string[]): Promise<number[][]> {
    return this.runWithFallback((p) => p.embed(texts));
  }

  private async runWithFallback<T>(fn: (p: AIProvider) => Promise<T>): Promise<T> {
    let lastError: unknown = null;
    for (const provider of this.providers) {
      try {
        return await fn(provider);
      } catch (err) {
        lastError = err;
        console.warn(`[BKO] AI provider ${provider.name} failed, trying next:`, err);
      }
    }
    throw lastError || new Error('No AI provider available');
  }
}

function configKey(providers: AIProviderConfig[]): string {
  return providers.map((p) => `${p.provider}:${p.api_key?.slice(0, 8)}:${p.custom_model || p.model}`).join('|');
}

/**
 * Get the current AI provider based on user settings.
 * Returns a FallbackAIProvider when multiple providers are configured, with prioritized fallback.
 */
export async function getAIProvider(): Promise<AIProvider | null> {
  const settings = await loadSettings();

  if (!settings.ai_enabled) return null;

  const providers = settings.ai_providers ?? [];
  const configured = providers.filter((c) => c.api_key?.trim());

  if (configured.length === 0) return null;

  const key = configKey(configured);
  if (cachedProvider && cachedConfigKey === key) return cachedProvider;

  const instances = configured
    .map((c) => createProviderFromConfig(c))
    .filter((p): p is AIProvider => p !== null);

  if (instances.length === 0) return null;

  cachedProvider = instances.length === 1 ? instances[0]! : new FallbackAIProvider(instances);
  cachedConfigKey = key;
  return cachedProvider;
}

/**
 * Check if AI is available and configured.
 */
export async function isAIAvailable(): Promise<boolean> {
  const provider = await getAIProvider();
  return provider !== null && provider.isConfigured();
}

/**
 * Test the AI connection by making a simple request.
 * With multiple providers, tests the primary (first) provider.
 */
export async function testAIConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const provider = await getAIProvider();
    if (!provider) {
      return { connected: false, error: 'AI is not configured' };
    }
    if (!provider.isConfigured()) {
      return { connected: false, error: 'Provider is not properly configured' };
    }
    await provider.complete('Respond with just the word "ok".', {
      maxTokens: 10,
      temperature: 0,
    });
    return { connected: true };
  } catch (err: any) {
    return { connected: false, error: err?.message || 'Connection failed' };
  }
}

/**
 * Test a single provider config. Used by Settings to verify each provider.
 */
export async function testProviderConfig(config: AIProviderConfig): Promise<{ connected: boolean; error?: string }> {
  const provider = createProviderFromConfig(config);
  if (!provider || !provider.isConfigured()) {
    return { connected: false, error: 'Invalid or incomplete configuration' };
  }
  try {
    await provider.complete('Respond with just the word "ok".', { maxTokens: 10, temperature: 0 });
    return { connected: true };
  } catch (err: any) {
    return { connected: false, error: err?.message || 'Connection failed' };
  }
}

/**
 * Clear the cached provider (call when settings change).
 */
export function clearAICache(): void {
  cachedProvider = null;
  cachedConfigKey = '';
}
