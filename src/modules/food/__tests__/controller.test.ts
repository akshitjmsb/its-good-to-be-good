import { describe, expect, it } from 'vitest';
import { FoodModule, destroy, init } from '../controller';

describe('Food module controller', () => {
  it('exposes the init/destroy lifecycle', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(FoodModule.init).toBe(init);
    expect(FoodModule.destroy).toBe(destroy);
  });
});
