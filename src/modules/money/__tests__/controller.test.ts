import { describe, expect, it } from 'vitest';
import {
  MONEY_ROUTE,
  MoneyModule,
  destroy,
  init,
  navigateMoneyPage,
} from '../controller';

describe('Money module controller', () => {
  it('exposes init/destroy and the legacy navigateMoneyPage', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof navigateMoneyPage).toBe('function');
    expect(MoneyModule.init).toBe(init);
    expect(MoneyModule.destroy).toBe(destroy);
  });

  it('routes to money.html', () => {
    expect(MONEY_ROUTE).toBe('money.html');
  });
});
