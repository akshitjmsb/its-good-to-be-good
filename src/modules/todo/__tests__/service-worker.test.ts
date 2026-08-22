import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('notification-only service worker', () => {
  const source = readFileSync(
    new URL('../../../../public/sw.js', import.meta.url),
    'utf8'
  );

  it('handles notifications without intercepting or caching app pages', () => {
    expect(source).toContain("addEventListener('push'");
    expect(source).toContain("addEventListener('notificationclick'");
    expect(source).not.toContain("addEventListener('fetch'");
    expect(source).not.toContain('caches.open(');
  });
});
