import { describe, expect, it } from 'vitest';
import {
  TRAVEL_ROUTE,
  TravelModule,
  destroy,
  init,
  navigateTravelPage,
} from '../controller';

describe('Travel module controller', () => {
  it('exposes init/destroy and the legacy navigateTravelPage', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof navigateTravelPage).toBe('function');
    expect(TravelModule.init).toBe(init);
    expect(TravelModule.destroy).toBe(destroy);
  });

  it('routes to travel.html', () => {
    expect(TRAVEL_ROUTE).toBe('travel.html');
  });
});
