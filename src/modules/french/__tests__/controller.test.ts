import { describe, expect, it } from 'vitest';
import {
  FRENCH_ROUTE,
  FrenchModule,
  destroy,
  init,
  navigateToFrenchPage,
} from '../controller';

describe('French module controller', () => {
  it('exposes init/destroy and the legacy navigateToFrenchPage', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof navigateToFrenchPage).toBe('function');
    expect(FrenchModule.init).toBe(init);
    expect(FrenchModule.destroy).toBe(destroy);
  });

  it('points at the canonical french.html route', () => {
    expect(FRENCH_ROUTE).toBe('french.html');
  });
});
