import { describe, expect, it } from 'vitest';
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
