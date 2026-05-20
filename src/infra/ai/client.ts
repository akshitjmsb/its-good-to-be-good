/**
 * AI router — dispatches calls to the user-selected provider.
 *
 * The active provider is selected via `domains/ai/providerStore` and
 * implemented in `./providers/*`. Each call looks up the selected provider
 * at request time so flipping the dropdown takes effect for the next call
 * without re-importing modules.
 */

import { getSelectedProvider } from '../../domains/ai/providerStore';
import { anthropicProvider } from './providers/anthropic';
import { ollamaProvider } from './providers/ollama';
import { perplexityProvider } from './providers/perplexity';
import type { AIProvider, CallOptions, ProviderId } from './providers/types';

const PROVIDERS: Record<ProviderId, AIProvider> = {
  perplexity: perplexityProvider,
  claude: anthropicProvider,
  'qwen-local': ollamaProvider,
};

export function getProvider(id?: ProviderId): AIProvider {
  return PROVIDERS[id ?? getSelectedProvider()];
}

export function listProviders(): AIProvider[] {
  return [perplexityProvider, anthropicProvider, ollamaProvider];
}

export async function callAI(
  prompt: string,
  opts: CallOptions = {}
): Promise<string> {
  return getProvider().chat(prompt, opts);
}

export function hasProviderReady(id?: ProviderId): boolean {
  return getProvider(id).isReady();
}

export type { AIProvider, CallOptions, ProviderId } from './providers/types';

/**
 * Schema property for AI response format (legacy — used by modal controllers
 * that previously targeted Gemini's structured output API).
 */
export interface SchemaProperty {
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  description?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
}

export interface ResponseSchema {
  type: 'OBJECT' | 'ARRAY';
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  required?: string[];
}

export interface GenerateContentConfig {
  responseMimeType?: string;
  responseSchema?: ResponseSchema;
  tools?: Array<{ googleSearch?: Record<string, never> }>;
}

/**
 * Parse JSON from API response, handling markdown code blocks.
 */
export function parseJsonResponse(responseText: string): unknown {
  let jsonText = responseText.trim();

  jsonText = jsonText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw parseError;
  }
}

/**
 * Legacy shim — preserves the `ai.models.generateContent` shape used by
 * older modal controllers (worldOrder, poetry, solutionExplanation). Routes
 * the call through whichever provider is currently selected.
 */
export const ai = {
  models: {
    generateContent: async (params: {
      model?: string;
      contents: string;
      config?: GenerateContentConfig;
    }) => {
      const expectsJson =
        params.config?.responseMimeType === 'application/json';

      const callOpts: CallOptions = {
        responseFormat: expectsJson ? 'json_object' : 'text',
      };
      if (params.model) callOpts.model = params.model;

      const response = await callAI(params.contents, callOpts);

      let text = response;
      if (expectsJson) {
        const jsonMatch =
          response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
          response.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          text = jsonMatch[1];
        }
      }

      return { text };
    },
  },
};

