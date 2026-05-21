import { describe, expect, it } from 'vitest';
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
