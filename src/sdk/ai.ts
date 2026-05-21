/**
 * AI adapter — wraps src/infra/ai/client.ts.
 *
 * Modules must list 'ai' in their manifest permissions to call any of
 * these methods. The factory in `./index.ts` wires permission enforcement.
 */

import {
  callAI as routerCallAI,
  hasProviderReady as routerHasProviderReady,
  parseJsonResponse as routerParseJsonResponse,
} from '../infra/ai/client';
import type { CallOptions } from '../infra/ai/providers/types';
import type { AIAdapter } from './types';

export function createAIAdapter(): AIAdapter {
  return {
    callAI(prompt: string, opts?: CallOptions) {
      return routerCallAI(prompt, opts);
    },
    hasProviderReady() {
      return routerHasProviderReady();
    },
    parseJsonResponse(text: string) {
      return routerParseJsonResponse(text);
    },
  };
}
