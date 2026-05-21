import { describe, expect, it } from 'vitest';
import {
  MEDITATE_ROUTE,
  MeditateModule,
  destroy,
  init,
  navigateMeditatePage,
} from '../controller';

describe('Meditate module controller', () => {
  it('exposes init/destroy and the legacy navigateMeditatePage', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof navigateMeditatePage).toBe('function');
    expect(MeditateModule.init).toBe(init);
    expect(MeditateModule.destroy).toBe(destroy);
  });

  it('routes to meditate.html', () => {
    expect(MEDITATE_ROUTE).toBe('meditate.html');
  });
});
