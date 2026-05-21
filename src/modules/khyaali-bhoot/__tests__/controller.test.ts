import { describe, expect, it } from 'vitest';
import {
  KHYAALI_BHOOT_ROUTE,
  KhyaaliBhootModule,
  destroy,
  init,
  navigateKhyaaliBhootPage,
} from '../controller';

describe('Khyaali Bhoot module controller', () => {
  it('exposes init/destroy and the legacy navigateKhyaaliBhootPage', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof navigateKhyaaliBhootPage).toBe('function');
    expect(KhyaaliBhootModule.init).toBe(init);
    expect(KhyaaliBhootModule.destroy).toBe(destroy);
  });

  it('routes to khyaali-bhoot.html', () => {
    expect(KHYAALI_BHOOT_ROUTE).toBe('khyaali-bhoot.html');
  });
});
