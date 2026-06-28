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

import { CuriousModule, destroy, init, showHoodModal } from '../controller';

describe('Curious module controller', () => {
  it('exposes init/destroy and the legacy showHoodModal entry', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof showHoodModal).toBe('function');
    expect(CuriousModule.init).toBe(init);
    expect(CuriousModule.destroy).toBe(destroy);
  });
});
