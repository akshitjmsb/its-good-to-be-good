import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The router pulls in the SDK factory which transitively imports the Convex
// client (via the cache adapter). Mock it so the tests stay hermetic.
vi.mock('../../lib/convex', () => ({
  convex: { query: vi.fn(), mutation: vi.fn(), action: vi.fn() },
}));

// Same for the auth store: pretend there is a signed-in user so the SDK
// user adapter resolves to a deterministic id during router mounts.
vi.mock('../../domains/auth/store', () => ({
  initAuthStore: vi.fn().mockResolvedValue({
    status: 'authed',
    user: { id: 'test-user', email: 'test@example.com' },
    session: null,
  }),
  getAuthState: () => ({
    status: 'authed' as const,
    user: { id: 'test-user', email: 'test@example.com' },
    session: null,
  }),
  subscribeAuth: () => () => undefined,
}));

// Override the loader so we can register fake manifests + controllers
// without needing real `src/modules/*` folders to be reshaped per test.
const fakeManifests = new Map<string, import('../types').ModuleManifest>();
const fakeControllers = new Map<
  string,
  import('../types').ModuleController | null
>();

vi.mock('../loader', () => ({
  getManifest: (id: string) => fakeManifests.get(id) ?? null,
  loadModuleController: async (id: string) =>
    fakeControllers.get(id) ?? null,
  getAllManifests: () => [...fakeManifests.values()],
}));

import {
  HASH_PREFIX,
  createRouter,
  formatRouteHash,
  parseRouteHash,
  type RouterContainerResolver,
  type RouterOptions,
} from '../router';
import type { ModuleManifest } from '../types';

type RouterWin = NonNullable<RouterOptions['win']>;

function manifest(overrides: Partial<ModuleManifest> = {}): ModuleManifest {
  return {
    id: 'fake-modal',
    displayName: 'Fake',
    category: 'learn',
    surface: 'modal',
    icon: './icon.svg',
    version: '0.1.0',
    ...overrides,
  };
}

interface FakeContainer {
  id: string;
  children: unknown[];
  innerHTML: string;
}

function fakeContainer(id: string): FakeContainer {
  return { id, children: [], innerHTML: '' };
}

type FakeWindow = RouterWin & {
  /** Helper: fire a fake `hashchange` to whichever listener is registered. */
  fire(): void;
  /** Spy for the addEventListener registration (test assertions). */
  addEventListenerSpy: ReturnType<typeof vi.fn>;
  /** Spy for removeEventListener (test assertions). */
  removeEventListenerSpy: ReturnType<typeof vi.fn>;
};

function fakeWindow(initialHash = ''): FakeWindow {
  let listener: EventListener | null = null;
  const addSpy = vi.fn((event: string, cb: EventListener) => {
    if (event === 'hashchange') listener = cb;
  });
  const removeSpy = vi.fn((event: string, cb: EventListener) => {
    if (event === 'hashchange' && listener === cb) listener = null;
  });
  return {
    location: { hash: initialHash } as Location,
    addEventListener: addSpy as unknown as RouterWin['addEventListener'],
    removeEventListener: removeSpy as unknown as RouterWin['removeEventListener'],
    fire() {
      listener?.(new Event('hashchange'));
    },
    addEventListenerSpy: addSpy,
    removeEventListenerSpy: removeSpy,
  };
}

beforeEach(() => {
  fakeManifests.clear();
  fakeControllers.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseRouteHash', () => {
  it('returns null for empty / non-route hashes', () => {
    expect(parseRouteHash('')).toBeNull();
    expect(parseRouteHash(null)).toBeNull();
    expect(parseRouteHash(undefined)).toBeNull();
    expect(parseRouteHash('#something-else')).toBeNull();
    expect(parseRouteHash('#/other/coffee')).toBeNull();
  });

  it('extracts kebab-case module ids', () => {
    expect(parseRouteHash('#/m/coffee')).toBe('coffee');
    expect(parseRouteHash('#/m/world-order')).toBe('world-order');
    expect(parseRouteHash('#/m/khyaali-bhoot')).toBe('khyaali-bhoot');
  });

  it('rejects invalid ids', () => {
    expect(parseRouteHash('#/m/')).toBeNull();
    expect(parseRouteHash('#/m/Coffee')).toBeNull();
    expect(parseRouteHash('#/m/1coffee')).toBeNull();
    expect(parseRouteHash('#/m/coffee/extra')).toBeNull();
  });
});

describe('formatRouteHash', () => {
  it('prepends the route prefix', () => {
    expect(formatRouteHash('coffee')).toBe(`${HASH_PREFIX}coffee`);
  });
});

describe('createRouter — mount lifecycle', () => {
  it('mounts a module on start when the hash already points at it', async () => {
    const container = fakeContainer('coffee-content');
    fakeManifests.set('coffee', manifest({ id: 'coffee' }));

    const init = vi.fn().mockResolvedValue(undefined);
    const destroy = vi.fn();
    fakeControllers.set('coffee', { init, destroy });

    const onEnter = vi.fn();
    const onLeave = vi.fn();
    const resolver: RouterContainerResolver = {
      resolve: () => container as unknown as HTMLElement,
      onEnter,
      onLeave,
    };

    const win = fakeWindow('#/m/coffee');
    const router = createRouter({
      win,
      containerResolver: resolver,
      today: () => '2026-05-21',
    });

    await router.start();

    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledTimes(1);
    const ctx = init.mock.calls[0][0];
    expect(ctx.container).toBe(container);
    expect(ctx.today).toBe('2026-05-21');
    expect(typeof ctx.sdk.events.emit).toBe('function');
    expect(router.current()).toBe('coffee');
    expect(destroy).not.toHaveBeenCalled();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('does not mount when the hash is empty', async () => {
    fakeManifests.set('coffee', manifest({ id: 'coffee' }));
    const init = vi.fn();
    fakeControllers.set('coffee', { init, destroy: vi.fn() });

    const resolver: RouterContainerResolver = {
      resolve: () => fakeContainer('x') as unknown as HTMLElement,
    };

    const win = fakeWindow('');
    const router = createRouter({ win, containerResolver: resolver });
    await router.start();

    expect(init).not.toHaveBeenCalled();
    expect(router.current()).toBeNull();
  });

  it('navigate(id) updates the hash and triggers hashchange-driven mount', async () => {
    fakeManifests.set('coffee', manifest({ id: 'coffee' }));
    const init = vi.fn().mockResolvedValue(undefined);
    const destroy = vi.fn();
    fakeControllers.set('coffee', { init, destroy });

    const resolver: RouterContainerResolver = {
      resolve: () => fakeContainer('coffee') as unknown as HTMLElement,
    };

    const win = fakeWindow('');
    const router = createRouter({ win, containerResolver: resolver });
    await router.start();

    expect(init).not.toHaveBeenCalled();

    // navigate sets the hash; in a real browser, hashchange fires. Simulate it.
    void router.navigate('coffee');
    expect(win.location.hash).toBe('#/m/coffee');
    win.fire();
    // Let microtasks settle.
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(init).toHaveBeenCalledTimes(1);
    expect(router.current()).toBe('coffee');
  });

  it('navigate(null) clears the hash and unmounts via hashchange', async () => {
    fakeManifests.set('coffee', manifest({ id: 'coffee' }));
    const destroy = vi.fn();
    fakeControllers.set('coffee', {
      init: vi.fn().mockResolvedValue(undefined),
      destroy,
    });

    const onLeave = vi.fn();
    const resolver: RouterContainerResolver = {
      resolve: () => fakeContainer('coffee') as unknown as HTMLElement,
      onLeave,
    };

    const win = fakeWindow('#/m/coffee');
    const router = createRouter({ win, containerResolver: resolver });
    await router.start();
    expect(router.current()).toBe('coffee');

    void router.navigate(null);
    expect(win.location.hash).toBe('');
    win.fire();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(router.current()).toBeNull();
  });

  it('hashchange between two modules unmounts the previous one before mounting the next', async () => {
    fakeManifests.set('coffee', manifest({ id: 'coffee' }));
    fakeManifests.set('poetry', manifest({ id: 'poetry' }));

    const order: string[] = [];
    fakeControllers.set('coffee', {
      init: vi.fn(async () => {
        order.push('coffee:init');
      }),
      destroy: vi.fn(() => {
        order.push('coffee:destroy');
      }),
    });
    fakeControllers.set('poetry', {
      init: vi.fn(async () => {
        order.push('poetry:init');
      }),
      destroy: vi.fn(() => {
        order.push('poetry:destroy');
      }),
    });

    const resolver: RouterContainerResolver = {
      resolve: (m) => fakeContainer(m.id) as unknown as HTMLElement,
      onEnter: (m) => order.push(`${m.id}:onEnter`),
      onLeave: (m) => order.push(`${m.id}:onLeave`),
    };

    const win = fakeWindow('#/m/coffee');
    const router = createRouter({ win, containerResolver: resolver });
    await router.start();

    win.location.hash = '#/m/poetry';
    win.fire();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(router.current()).toBe('poetry');
    // destroy must precede the next init so the previous module fully tears
    // down before its sibling renders.
    expect(order.indexOf('coffee:destroy')).toBeLessThan(
      order.indexOf('poetry:init')
    );
    expect(order).toContain('coffee:onLeave');
    expect(order).toContain('poetry:onEnter');
  });

  it('stop() unmounts the active module and removes the listener', async () => {
    fakeManifests.set('coffee', manifest({ id: 'coffee' }));
    const destroy = vi.fn();
    fakeControllers.set('coffee', {
      init: vi.fn().mockResolvedValue(undefined),
      destroy,
    });

    const resolver: RouterContainerResolver = {
      resolve: () => fakeContainer('coffee') as unknown as HTMLElement,
    };

    const win = fakeWindow('#/m/coffee');
    const router = createRouter({ win, containerResolver: resolver });
    await router.start();
    expect(router.current()).toBe('coffee');

    await router.stop();
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(router.current()).toBeNull();
    expect(win.removeEventListenerSpy).toHaveBeenCalledWith(
      'hashchange',
      expect.any(Function)
    );
  });
});

describe('createRouter — back-compat & filtering', () => {
  it('does NOT mount journey/page modules (lets native navigation own them)', async () => {
    fakeManifests.set(
      'todo',
      manifest({ id: 'todo', category: 'journey', surface: 'page' })
    );
    const init = vi.fn();
    fakeControllers.set('todo', { init, destroy: vi.fn() });

    const resolver: RouterContainerResolver = {
      resolve: () => fakeContainer('todo') as unknown as HTMLElement,
    };

    const win = fakeWindow('#/m/todo');
    const router = createRouter({ win, containerResolver: resolver });
    await router.start();

    // Default shouldHandle filters out page-surface modules so the existing
    // multi-page navigation stays in charge of journey modules.
    expect(init).not.toHaveBeenCalled();
    expect(router.current()).toBeNull();
  });

  it('does nothing for unknown module ids', async () => {
    const init = vi.fn();
    const resolver: RouterContainerResolver = {
      resolve: () => fakeContainer('x') as unknown as HTMLElement,
    };

    const win = fakeWindow('#/m/nope');
    const router = createRouter({ win, containerResolver: resolver });
    await router.start();

    expect(init).not.toHaveBeenCalled();
    expect(router.current()).toBeNull();
  });

  it('aborts the mount when the resolver returns null (no container)', async () => {
    fakeManifests.set('coffee', manifest({ id: 'coffee' }));
    const init = vi.fn();
    fakeControllers.set('coffee', { init, destroy: vi.fn() });

    const resolver: RouterContainerResolver = {
      resolve: () => null,
    };

    const win = fakeWindow('#/m/coffee');
    const router = createRouter({ win, containerResolver: resolver });
    await router.start();

    expect(init).not.toHaveBeenCalled();
    expect(router.current()).toBeNull();
  });

  it('shouldHandle override extends the router to other surfaces', async () => {
    fakeManifests.set(
      'inline-thing',
      manifest({ id: 'inline-thing', category: 'learn', surface: 'page' })
    );
    const init = vi.fn().mockResolvedValue(undefined);
    fakeControllers.set('inline-thing', { init, destroy: vi.fn() });

    const resolver: RouterContainerResolver = {
      resolve: () => fakeContainer('inline-thing') as unknown as HTMLElement,
    };

    const win = fakeWindow('#/m/inline-thing');
    const router = createRouter({
      win,
      containerResolver: resolver,
      shouldHandle: () => true,
    });
    await router.start();

    expect(init).toHaveBeenCalledTimes(1);
    expect(router.current()).toBe('inline-thing');
  });

  it('survives a controller init that throws (no leaked mount state)', async () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    fakeManifests.set('boom', manifest({ id: 'boom' }));
    const destroy = vi.fn();
    fakeControllers.set('boom', {
      init: vi.fn().mockRejectedValue(new Error('boom')),
      destroy,
    });

    const onLeave = vi.fn();
    const resolver: RouterContainerResolver = {
      resolve: () => fakeContainer('boom') as unknown as HTMLElement,
      onLeave,
    };

    const win = fakeWindow('#/m/boom');
    const router = createRouter({ win, containerResolver: resolver });
    await router.start();

    expect(router.current()).toBeNull();
    // We never registered a mount, so destroy should not run.
    expect(destroy).not.toHaveBeenCalled();
    // But onLeave should fire so any chrome opened by onEnter is rolled back.
    expect(onLeave).toHaveBeenCalledTimes(1);
    consoleErr.mockRestore();
  });
});

describe('createRouter — headless mode (no window)', () => {
  it('navigate(id) still drives mount/unmount without a window object', async () => {
    fakeManifests.set('coffee', manifest({ id: 'coffee' }));
    const init = vi.fn().mockResolvedValue(undefined);
    const destroy = vi.fn();
    fakeControllers.set('coffee', { init, destroy });

    const resolver: RouterContainerResolver = {
      resolve: () => fakeContainer('coffee') as unknown as HTMLElement,
    };

    const router = createRouter({
      win: undefined,
      containerResolver: resolver,
    });
    await router.start();

    await router.navigate('coffee');
    expect(init).toHaveBeenCalledTimes(1);
    expect(router.current()).toBe('coffee');

    await router.navigate(null);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(router.current()).toBeNull();
  });
});
