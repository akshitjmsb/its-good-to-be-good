import type { AIProvider, CallOptions } from './types';

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY as string | undefined;
const hasKey = Boolean(apiKey && apiKey !== 'test_key_for_development');

export const perplexityProvider: AIProvider = {
  id: 'perplexity',
  displayName: 'perplexity',
  isReady: () => hasKey,
  async chat(prompt: string, opts: CallOptions = {}): Promise<string> {
    if (!hasKey) {
      throw new Error('Perplexity API key not configured');
    }

    const { model = 'sonar-pro', temperature = 0.7, systemPrompt } = opts;
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, temperature }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  },
};
