import { describe, expect, it } from 'vitest';
import {
  WorldOrderModule,
  destroy,
  fetchAndShowWorldOrder,
  init,
} from '../controller';
import { renderWorldOrderHeadlines } from '../view';

describe('WorldOrder module controller', () => {
  it('exposes init/destroy and the legacy fetchAndShowWorldOrder surface', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof fetchAndShowWorldOrder).toBe('function');
    expect(WorldOrderModule.init).toBe(init);
    expect(WorldOrderModule.destroy).toBe(destroy);
  });

  it('renderWorldOrderHeadlines strips markdown asterisks and escapes input', () => {
    const html = renderWorldOrderHeadlines({
      text: '*Bold* headline <script>x</script>',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('*');
    expect(html).toContain('Bold');
  });
});
