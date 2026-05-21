import { describe, expect, it } from 'vitest';
import {
  GuitarModule,
  MR_MOJO_RISING_URL,
  destroy,
  init,
  openMrMojoRising,
} from '../controller';

describe('Guitar module controller', () => {
  it('exposes init/destroy and the legacy openMrMojoRising', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof openMrMojoRising).toBe('function');
    expect(GuitarModule.init).toBe(init);
    expect(GuitarModule.destroy).toBe(destroy);
  });

  it('points to the published Mr. Mojo Rising URL', () => {
    expect(MR_MOJO_RISING_URL).toMatch(/^https:\/\//);
  });
});
