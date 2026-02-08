// ============================================================
// AI Provider Interface - Provider-agnostic abstraction
// ============================================================

export interface AIProvider {
  readonly name: string;

  /** Check if the provider is configured and ready to use */
  isConfigured(): boolean;

  /** Generate a text completion */
  complete(prompt: string, options?: CompletionOptions): Promise<string>;

  /** Generate embeddings for text */
  embed(texts: string[]): Promise<number[][]>;

  /** Chat-style completion with message history */
  chat(messages: ChatMessage[], options?: CompletionOptions): Promise<string>;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIClusterResult {
  clusters: Array<{
    label: string;
    description: string;
    item_indices: number[];
  }>;
}

export interface AISummaryResult {
  summary: string;
  key_points: string[];
  themes: string[];
}

export interface AIBrainstormResult {
  ideas: Array<{
    title: string;
    description: string;
    relevance: string;
  }>;
}

export interface AIConceptResult {
  concepts: Array<{
    label: string;
    explanation: string;
    confidence: number;
  }>;
}
