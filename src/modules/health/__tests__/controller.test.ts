import { describe, expect, it } from 'vitest';
import {
  HEALTH_ROUTE,
  HealthModule,
  destroy,
  init,
  navigateHealthPage,
} from '../controller';

describe('Health module controller', () => {
  it('exposes init/destroy and the legacy navigateHealthPage', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof navigateHealthPage).toBe('function');
    expect(HealthModule.init).toBe(init);
    expect(HealthModule.destroy).toBe(destroy);
  });

  it('routes to health.html', () => {
    expect(HEALTH_ROUTE).toBe('health.html');
  });
});
