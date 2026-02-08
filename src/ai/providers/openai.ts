// ============================================================
// OpenAI Provider Implementation
// ============================================================

import type { AIProvider, CompletionOptions, ChatMessage } from '../interface';

export class OpenAIProvider implements AIProvider {
  readonly name = 'OpenAI';
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  private model: string;
  private embeddingModel = 'text-embedding-3-small';

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4o-mini';
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-');
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    return this.chat(
      [
        ...(options?.systemPrompt
          ? [{ role: 'system' as const, content: options.systemPrompt }]
          : []),
        { role: 'user' as const, content: prompt },
      ],
      options,
    );
  }

  async chat(messages: ChatMessage[], options?: CompletionOptions): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} - ${(error as any)?.error?.message || 'Unknown error'}`,
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: texts,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI Embeddings API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }
}
