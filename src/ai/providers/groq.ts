// ============================================================
// GroqCloud Provider Implementation
// ============================================================

import type { AIProvider, CompletionOptions, ChatMessage } from '../interface';

export class GroqProvider implements AIProvider {
  readonly name = 'GroqCloud';
  private apiKey: string;
  private baseUrl = 'https://api.groq.com/openai/v1';
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || 'llama-3.3-70b-versatile';
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 10;
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
        `GroqCloud API error: ${response.status} - ${(error as any)?.error?.message || 'Unknown error'}`,
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async embed(_texts: string[]): Promise<number[][]> {
    throw new Error(
      'GroqCloud does not provide an embedding API. Use OpenAI for embeddings.',
    );
  }
}
