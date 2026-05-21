import { describe, expect, it } from 'vitest';
import {
  TENNIS_ROUTE,
  TennisModule,
  destroy,
  init,
  navigateTennisPage,
} from '../controller';

describe('Tennis module controller', () => {
  it('exposes init/destroy and the legacy navigateTennisPage', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof navigateTennisPage).toBe('function');
    expect(TennisModule.init).toBe(init);
    expect(TennisModule.destroy).toBe(destroy);
  });

  it('routes to tennis.html', () => {
    expect(TENNIS_ROUTE).toBe('tennis.html');
  });
});
