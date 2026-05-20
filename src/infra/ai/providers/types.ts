export type ProviderId = 'perplexity' | 'claude' | 'qwen-local';

export interface CallOptions {
  temperature?: number;
  responseFormat?: 'json_object' | 'text';
  systemPrompt?: string;
  model?: string;
}

export interface AIProvider {
  id: ProviderId;
  displayName: string;
  isReady(): boolean;
  chat(prompt: string, opts?: CallOptions): Promise<string>;
}
