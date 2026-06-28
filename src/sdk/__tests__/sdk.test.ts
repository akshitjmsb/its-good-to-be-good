import { describe, expect, it, vi } from 'vitest';

// The cache adapter pulls in the Convex client, which throws at import time
// when VITE_CONVEX_URL is missing. Mock it to keep the test hermetic.
vi.mock('../../lib/convex', () => ({
  convex: { query: vi.fn(), mutation: vi.fn(), action: vi.fn() },
}));

import { createModuleSDK } from '../index';
import type { ModuleManifest } from '../types';

function manifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
  return {
    id: 'test-module',
    displayName: 'Test Module',
    category: 'learn',
    surface: 'modal',
    icon: './icon.svg',
    version: '0.1.0',
    ...overrides,
  };
}

describe('createModuleSDK', () => {
  it('always provides events, ui, and user regardless of permissions', () => {
    const sdk = createModuleSDK(manifest());

    expect(typeof sdk.events.emit).toBe('function');
    expect(typeof sdk.events.on).toBe('function');
    expect(typeof sdk.ui.showToast).toBe('function');
    expect(typeof sdk.user.id).toBe('function');
  });

  it('throws from user.id() when no authenticated session is present', () => {
    const sdk = createModuleSDK(manifest());
    expect(() => sdk.user.id()).toThrow(/No authenticated user/);
  });

  it('lets a caller override the user id (for tests / shell init)', () => {
    const sdk = createModuleSDK(manifest(), 'user-123');
    expect(sdk.user.id()).toBe('user-123');
    expect(sdk.user.isAuthenticated()).toBe(true);
  });

  it('exposes ai adapter when "ai" permission is granted', () => {
    const sdk = createModuleSDK(manifest({ permissions: ['ai'] }));
    expect(typeof sdk.ai.callAI).toBe('function');
    expect(typeof sdk.ai.hasProviderReady).toBe('function');
    expect(typeof sdk.ai.parseJsonResponse).toBe('function');
  });

  it('throws a clear error when ai is used without permission', () => {
    const sdk = createModuleSDK(manifest({ id: 'coffee' })); // no ai
    expect(() => sdk.ai.callAI('hello')).toThrow(
      /Module "coffee" tried to call ai\.callAI/
    );
    expect(() => sdk.ai.hasProviderReady()).toThrow(/"ai" permission/);
  });

  it('throws when storage is used without permission', () => {
    const sdk = createModuleSDK(manifest({ id: 'no-storage' }));
    expect(() => sdk.storage.get('key')).toThrow(/"storage" permission/);
    expect(() => sdk.storage.set('key', 1)).toThrow(/no-storage/);
  });

  it('throws when timer is used without permission', () => {
    const sdk = createModuleSDK(manifest({ id: 'no-timer' }));
    expect(() => sdk.timer.create({ name: 't', defaultDurationMs: 1000 })).toThrow(
      /"timer" permission/
    );
  });

  it('throws when cache is used without permission', () => {
    const sdk = createModuleSDK(manifest({ id: 'no-cache' }));
    expect(() => sdk.cache.get('content', '2026-01-01')).toThrow(
      /"cache" permission/
    );
  });

  it('returns a real storage adapter when "storage" is granted', () => {
    const sdk = createModuleSDK(manifest({ id: 'has-storage', permissions: ['storage'] }));
    expect(typeof sdk.storage.get).toBe('function');
    expect(typeof sdk.storage.set).toBe('function');
    expect(typeof sdk.storage.subscribe).toBe('function');
  });

  it('returns a real timer adapter when "timer" is granted', () => {
    const sdk = createModuleSDK(manifest({ id: 'has-timer', permissions: ['timer'] }));
    expect(typeof sdk.timer.create).toBe('function');
  });

  it('returns a real cache adapter when "cache" is granted', () => {
    const sdk = createModuleSDK(manifest({ id: 'has-cache', permissions: ['cache'] }));
    expect(typeof sdk.cache.get).toBe('function');
    expect(typeof sdk.cache.set).toBe('function');
  });

  it('grants all permissions independently', () => {
    const sdk = createModuleSDK(
      manifest({ id: 'all', permissions: ['ai', 'cache', 'storage', 'timer'] })
    );
    expect(typeof sdk.ai.callAI).toBe('function');
    expect(typeof sdk.cache.get).toBe('function');
    expect(typeof sdk.storage.get).toBe('function');
    expect(typeof sdk.timer.create).toBe('function');
  });
});
