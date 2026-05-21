import { describe, expect, it } from 'vitest';
import { FoodModule, destroy, init, showFoodModal } from '../controller';

describe('Food module controller', () => {
  it('exposes init/destroy and the legacy showFoodModal entry', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof showFoodModal).toBe('function');
    expect(FoodModule.init).toBe(init);
    expect(FoodModule.destroy).toBe(destroy);
  });
});
