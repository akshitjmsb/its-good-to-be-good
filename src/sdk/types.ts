/**
 * King SDK — public contract between the shell and modules.
 *
 * Each module is a self-contained mini-app inside `src/modules/<id>/`,
 * described by its manifest.json. The ring encodes the home's geometry:
 *
 *   • `circle` — a soul practice. Acts in place on the home, leaves
 *     nothing behind, never navigates. No routeHref.
 *   • `square` — a purpose tool. Opens its own page (routeHref) from a
 *     corner tile on the home and accumulates a record.
 *
 * Permissions in the manifest gate which SDK adapters the module is allowed
 * to call. Calling an adapter that isn't listed throws a clear error at
 * runtime, so missing permissions surface in dev rather than at deploy.
 */

export type ModuleRing = 'circle' | 'square';
export type ModuleRenderer = 'dom';
export type ModulePermission = 'storage' | 'timer';

export interface ModuleManifest {
  /** kebab-case unique id (matches folder name) */
  id: string;
  /** user-visible name */
  displayName: string;
  ring: ModuleRing;
  /** the tool's page — required for square, forbidden for circle */
  routeHref?: string;
  /** path to icon SVG, relative to the module folder */
  icon: string;
  /** semver */
  version: string;
  permissions?: ModulePermission[];
  /** default 'dom' */
  renderer?: ModuleRenderer;
}

/**
 * The typed SDK surface a module receives. Sub-interfaces wrap existing
 * infrastructure rather than introduce new capabilities.
 */
export interface KingSDK {
  storage: StorageAdapter;
  timer: TimerAdapter;
  events: EventBus;
  ui: UIAdapter;
  user: UserAdapter;
}

/* ── Storage (namespaced localStorage with cross-tab sync) ────────────── */

export type StorageUnsubscribe = () => void;

export interface StorageAdapter {
  get<T = unknown>(key: string): T | null;
  set<T = unknown>(key: string, value: T): void;
  remove(key: string): void;
  /**
   * Listen for cross-tab changes to a key (uses the native `storage` event).
   * Fires with `null` when the key was removed.
   */
  subscribe<T = unknown>(
    key: string,
    listener: (value: T | null) => void
  ): StorageUnsubscribe;
}

/* ── Timer (wraps src/core/countdownTimer.ts) ─────────────────────────── */

export interface TimerHandle {
  start(): void;
  cancel(): void;
  skipBreak(): void;
  setDuration(ms: number): void;
  refresh(): void;
  destroy(): void;
  subscribe(listener: (state: TimerState) => void): () => void;
  getState(): TimerState;
}

export interface TimerState {
  status: 'idle' | 'running' | 'break';
  endsAt: number | null;
  remainingMs: number;
  durationMs: number;
}

export interface TimerAdapter {
  /**
   * Create a countdown timer scoped to the module. The namespace is
   * automatically prefixed with the module id so timers don't collide
   * across modules.
   */
  create(opts: { name: string; defaultDurationMs: number }): TimerHandle;
}

/* ── Events (pub/sub) ─────────────────────────────────────────────────── */

export type EventListener<T> = (payload: T) => void;

export interface EventBus {
  emit<T = unknown>(event: string, payload?: T): void;
  on<T = unknown>(event: string, listener: EventListener<T>): () => void;
  off<T = unknown>(event: string, listener: EventListener<T>): void;
  /** Number of listeners registered for `event` (for tests). */
  listenerCount(event: string): number;
}

/* ── UI primitives ────────────────────────────────────────────────────── */

export interface UIAdapter {
  /** Non-blocking toast (kept text-only to match the vintage aesthetic). */
  showToast(message: string, opts?: { durationMs?: number }): void;
  /** Confirm dialog. Returns true if the user accepted. */
  confirm(message: string): Promise<boolean>;
  /** Render a loading state into a container. Returns a teardown fn. */
  showLoading(
    container: HTMLElement,
    message?: string
  ): () => void;
}

/* ── User ─────────────────────────────────────────────────────────────── */

export interface UserAdapter {
  /** Currently active user id. Throws when unauthenticated. */
  id(): string;
  /** Email of the active user, or null if unauthenticated. */
  email(): string | null;
  /** True when a real authenticated session is present. */
  isAuthenticated(): boolean;
  /** Subscribe to auth-state changes (sign-in, sign-out, refresh). */
  subscribe(listener: () => void): () => void;
}
