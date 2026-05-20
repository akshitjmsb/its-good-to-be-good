import type { AIProvider, CallOptions } from './types';

const endpoint =
  (import.meta.env.VITE_OLLAMA_URL as string | undefined) ||
  'http://localhost:11434';
const defaultModel =
  (import.meta.env.VITE_OLLAMA_MODEL as string | undefined) || 'qwen2.5';

export const ollamaProvider: AIProvider = {
  id: 'qwen-local',
  displayName: 'local qwen',
  isReady: () => true,
  async chat(prompt: string, opts: CallOptions = {}): Promise<string> {
    const { model = defaultModel, temperature = 0.7, systemPrompt } = opts;
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    let response: Response;
    try {
      response = await fetch(`${endpoint}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: { temperature },
        }),
      });
    } catch (err) {
      // Network/CORS failures surface as TypeError before we ever see a status.
      // Ollama needs OLLAMA_ORIGINS set to allow browser requests.
      throw new Error(
        `Could not reach Ollama at ${endpoint}. Is the server running? If you see a CORS error in the console, restart Ollama with OLLAMA_ORIGINS='*' set. (${(err as Error).message})`
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  },
};
