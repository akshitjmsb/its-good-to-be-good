import { describe, expect, it } from 'vitest';
import {
  BEING_ROUTE,
  BeingModule,
  destroy,
  init,
  navigateBeingPage,
} from '../controller';

describe('Being module controller', () => {
  it('exposes init/destroy and the navigateBeingPage handle', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof navigateBeingPage).toBe('function');
    expect(BeingModule.init).toBe(init);
    expect(BeingModule.destroy).toBe(destroy);
  });

  it('routes to the home page (Being IS the home)', () => {
    expect(BEING_ROUTE).toBe('index.html');
  });
});
