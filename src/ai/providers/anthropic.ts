// ============================================================
// Anthropic Provider Implementation
// ============================================================

import type { AIProvider, CompletionOptions, ChatMessage } from '../interface';

export class AnthropicProvider implements AIProvider {
  readonly name = 'Anthropic';
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'claude-3-5-haiku-latest';
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 10;
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    return this.chat(
      [{ role: 'user' as const, content: prompt }],
      options,
    );
  }

  async chat(messages: ChatMessage[], options?: CompletionOptions): Promise<string> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: options?.maxTokens || 1000,
      messages: nonSystemMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (systemMessage || options?.systemPrompt) {
      body.system = systemMessage?.content || options?.systemPrompt;
    }

    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Anthropic API error: ${response.status} - ${(error as any)?.error?.message || 'Unknown error'}`,
      );
    }

    const data = await response.json();
    const textBlock = data.content?.find((c: any) => c.type === 'text');
    return textBlock?.text || '';
  }

  async embed(_texts: string[]): Promise<number[][]> {
    // Anthropic doesn't have a native embedding API
    // Return empty arrays as a fallback
    throw new Error(
      'Anthropic does not provide an embedding API. Use OpenAI for embeddings.',
    );
  }
}
