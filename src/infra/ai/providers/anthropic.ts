import type { AIProvider, CallOptions } from './types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
const hasKey = Boolean(apiKey);

interface AnthropicContentBlock {
  type?: string;
  text?: string;
}

export const anthropicProvider: AIProvider = {
  id: 'claude',
  displayName: 'claude',
  isReady: () => hasKey,
  async chat(prompt: string, opts: CallOptions = {}): Promise<string> {
    if (!hasKey) {
      throw new Error('Anthropic API key not configured');
    }

    const { model = 'claude-sonnet-4-6', temperature = 0.7, systemPrompt } = opts;
    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    };
    if (systemPrompt) body.system = systemPrompt;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey as string,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.content;
    if (Array.isArray(content)) {
      return (content as AnthropicContentBlock[])
        .filter(block => block.type === 'text')
        .map(block => block.text ?? '')
        .join('');
    }
    return '';
  },
};
