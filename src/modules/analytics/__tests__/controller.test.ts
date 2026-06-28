import { describe, expect, it, vi } from 'vitest';

// The controller transitively imports the Convex client (via the cache
// adapter), which opens a WebSocket on construction. Mock it to stay hermetic.
vi.mock('../../../lib/convex', () => ({
  convex: {
    query: vi.fn(),
    mutation: vi.fn(),
    action: vi.fn(),
    onUpdate: vi.fn(),
    setAuth: vi.fn(),
    close: vi.fn(),
  },
}));

import {
  AnalyticsModule,
  cleanupAnalyticsEventListeners,
  destroy,
  init,
  showAnalyticsModal,
} from '../controller';

describe('Analytics module controller', () => {
  it('exposes init/destroy and the legacy surfaces', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof showAnalyticsModal).toBe('function');
    expect(typeof cleanupAnalyticsEventListeners).toBe('function');
    expect(AnalyticsModule.init).toBe(init);
    expect(AnalyticsModule.destroy).toBe(destroy);
  });

  it('cleanupAnalyticsEventListeners is safe to call with no listeners attached', () => {
    expect(() => cleanupAnalyticsEventListeners()).not.toThrow();
  });
});
