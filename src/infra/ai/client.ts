/**
 * Perplexity API Client
 * Core API wrapper for making requests to Perplexity AI
 */

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const apiKey = import.meta.env.VITE_PERPLEXITY_API_KEY as string;

export let hasApiKey = false;

if (apiKey && apiKey !== 'test_key_for_development') {
  hasApiKey = true;
} else {
  console.warn('Using development mode without Perplexity API key');
  hasApiKey = false;
}

export interface PerplexityOptions {
  model?: string;
  responseFormat?: 'json_object' | 'text';
  temperature?: number;
}

/**
 * Schema property for AI response format
 */
export interface SchemaProperty {
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
  description?: string;
  items?: SchemaProperty;
  properties?: Record<string, SchemaProperty>;
}

/**
 * Response schema for structured AI responses
 */
export interface ResponseSchema {
  type: 'OBJECT' | 'ARRAY';
  properties?: Record<string, SchemaProperty>;
  items?: SchemaProperty;
  required?: string[];
}

/**
 * Configuration for generateContent
 */
export interface GenerateContentConfig {
  responseMimeType?: string;
  responseSchema?: ResponseSchema;
  tools?: Array<{ googleSearch?: Record<string, never> }>;
}

/**
 * Call Perplexity API with a prompt
 */
export async function callPerplexityAPI(
  prompt: string,
  options: PerplexityOptions = {}
): Promise<string> {
  if (!hasApiKey) {
    throw new Error('Perplexity API key not configured');
  }

  const { model = 'sonar-pro', temperature = 0.7 } = options;

  const requestBody = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature,
  };

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Parse JSON from API response, handling markdown code blocks
 */
export function parseJsonResponse(responseText: string): unknown {
  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  jsonText = jsonText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    // Try to extract JSON object from text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw parseError;
  }
}

// Export a simple AI object for compatibility with existing modal code
export const ai = {
  models: {
    generateContent: async (params: {
      model?: string;
      contents: string;
      config?: GenerateContentConfig;
    }) => {
      const prompt = params.contents;
      const config = params.config;
      const expectsJson = config?.responseMimeType === 'application/json';

      const response = await callPerplexityAPI(prompt, {
        model: params.model || 'sonar-pro',
        responseFormat: 'text',
      });

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
