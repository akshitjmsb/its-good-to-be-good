/**
 * Durable persistence primitives — the standard resilience pattern for any
 * module that syncs a record to the server.
 *
 * Extracted from the To Do module, where each piece maps to a
 * previously-real data-loss bug. The pattern:
 *
 *   1. Every mutation writes a full snapshot to a localStorage WAL *before*
 *      the network save is attempted. Crash, close, or offline — nothing is
 *      lost; the next boot merges the WAL with the server state.
 *   2. All saves funnel through a SaveController: one save at a time, dirty
 *      is only cleared by a *confirmed* success, failures retry with backoff
 *      and then park in an `offline` state with the work still queued.
 *
 * Both are dependency-injected (storage, save, clock) so they are
 * deterministically testable and degrade to safe no-ops when localStorage
 * is unavailable (private mode, quota, SSR).
 */

/* ── Write-ahead log ─────────────────────────────────────────────────── */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Canonical WAL key: one log per module per user. */
export function walKey(moduleId: string, userId: string): string {
  return `king:${moduleId}:wal:${userId}`;
}

export interface Wal<Snapshot> {
  read(): Snapshot | null;
  /** True only when the snapshot reached durable local storage. */
  write(snapshot: Snapshot): boolean;
  clear(): void;
}

/**
 * Create a WAL for a module's snapshot type. `validate` turns the parsed
 * JSON into a snapshot, or null when the shape is wrong — a corrupt or
 * partial WAL reads as absent rather than crashing the boot.
 */
export function createWal<Snapshot>(
  storage: StorageLike | null,
  key: string,
  validate: (parsed: unknown) => Snapshot | null
): Wal<Snapshot> {
  return {
    read(): Snapshot | null {
      if (!storage) return null;
      try {
        const raw = storage.getItem(key);
        if (!raw) return null;
        return validate(JSON.parse(raw));
      } catch {
        return null;
      }
    },

    write(snapshot: Snapshot): boolean {
      if (!storage) return false;
      try {
        storage.setItem(key, JSON.stringify(snapshot));
        return true;
      } catch {
        // The caller must surface this; proceeding silently would falsely
        // promise crash safety when quota/private-mode storage rejected us.
        return false;
      }
    },

    clear(): void {
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Best-effort access to `localStorage`. Returns null when it is missing or
 * throws on first touch (Safari private mode), so callers get a WAL that
 * no-ops instead of an exception.
 */
export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__king_wal_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

/* ── Save controller ─────────────────────────────────────────────────── */

export type SaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'retrying'
  | 'offline'
  | 'signed-out';

export interface SaveControllerDeps<Snapshot> {
  /** Perform the actual persistence. Must reject on failure. */
  save: (snapshot: Snapshot) => Promise<void>;
  /** Snapshot the current state (including pending delete tombstones). */
  getSnapshot: () => Snapshot;
  /** Called after each confirmed save so the caller can drop flushed
   *  tombstones and (when fully clean) clear the WAL. */
  onPersisted?: (snapshot: Snapshot) => void;
  /** Status transitions, for the UI indicator. */
  onStatus?: (status: SaveStatus) => void;
  /** Backoff sleep — injected so tests can resolve instantly. */
  delay?: (ms: number) => Promise<void>;
  /** Retry backoff schedule after the first attempt. Default 1s / 2s / 4s. */
  retryDelaysMs?: number[];
}

export class SaveController<Snapshot> {
  private readonly deps: SaveControllerDeps<Snapshot>;
  private readonly delay: (ms: number) => Promise<void>;
  private readonly retryDelaysMs: number[];

  private saving = false;
  private mutationSeq = 0;
  private savedSeq = 0;
  private loaded = false;
  private authed = true;
  private scheduledKick: ReturnType<typeof setTimeout> | null = null;

  /** True after the retry budget is exhausted; cleared by the next success. */
  saveError = false;
  status: SaveStatus = 'idle';

  constructor(deps: SaveControllerDeps<Snapshot>) {
    this.deps = deps;
    this.delay = deps.delay ?? ((ms) => new Promise(r => setTimeout(r, ms)));
    this.retryDelaysMs = deps.retryDelaysMs ?? [1000, 2000, 4000];
  }

  /** Unsaved work exists when mutations have outpaced confirmed saves. */
  get dirty(): boolean {
    return this.mutationSeq > this.savedSeq;
  }

  /** A save is currently running (used by the sync guard). */
  get inFlight(): boolean {
    return this.saving;
  }

  private setStatus(status: SaveStatus): void {
    this.status = status;
    this.deps.onStatus?.(status);
  }

  /** Unlock saves once a clean initial load has happened. */
  setLoaded(loaded: boolean): void {
    this.loaded = loaded;
    if (loaded) this.kick();
  }

  /** React to auth changes: pause on sign-out, resume + flush on re-auth. */
  setAuthed(authed: boolean): void {
    if (authed === this.authed) return;
    this.authed = authed;
    if (!authed) {
      this.setStatus('signed-out');
    } else if (this.dirty) {
      this.kick();
    } else {
      this.setStatus('idle');
    }
  }

  /**
   * Record a local mutation and (re)start the flush loop. A caller may defer
   * network traffic briefly (useful for continuous rich-text typing) while
   * `dirty` flips immediately, so the WAL is still authoritative and sync is
   * still blocked from racing the local draft.
   */
  notifyMutation(delayMs = 0): void {
    this.mutationSeq++;
    if (delayMs <= 0) {
      if (this.scheduledKick) {
        clearTimeout(this.scheduledKick);
        this.scheduledKick = null;
      }
      this.kick();
      return;
    }

    if (this.scheduledKick) clearTimeout(this.scheduledKick);
    this.scheduledKick = setTimeout(() => {
      this.scheduledKick = null;
      this.kick();
    }, delayMs);
  }

  /** Flush any deliberately debounced local work now (for example, Done). */
  flushNow(): void {
    if (this.scheduledKick) {
      clearTimeout(this.scheduledKick);
      this.scheduledKick = null;
    }
    this.kick();
  }

  /** Manually re-attempt a stalled save (e.g. on a network 'online' event). */
  retry(): void {
    if (this.saveError) this.saveError = false;
    this.kick();
  }

  private canSave(): boolean {
    return this.loaded && this.authed;
  }

  private kick(): void {
    void this.flush();
  }

  private async flush(): Promise<void> {
    if (this.saving || !this.canSave() || !this.dirty) return;
    this.saving = true;
    try {
      while (this.dirty && this.canSave()) {
        const seq = this.mutationSeq;
        const snapshot = this.deps.getSnapshot();
        this.setStatus('saving');
        await this.saveWithRetry(snapshot);
        // Confirmed: advance the high-water mark. If more mutations landed
        // during the save, `dirty` is still true and the loop runs again.
        this.savedSeq = Math.max(this.savedSeq, seq);
        this.saveError = false;
        this.deps.onPersisted?.(snapshot);
        this.setStatus('saved');
      }
    } catch {
      // Out of retries (or signed out mid-retry). Leave savedSeq untouched so
      // `dirty` stays true; the WAL holds the data and the next mutation,
      // retry(), or re-auth will try again.
      this.saveError = true;
      this.setStatus(this.authed ? 'offline' : 'signed-out');
    } finally {
      this.saving = false;
    }
  }

  private async saveWithRetry(snapshot: Snapshot): Promise<void> {
    let lastError: unknown;
    // Attempt 0 has no preceding delay; attempts 1..n wait retryDelaysMs[i-1].
    for (let attempt = 0; attempt <= this.retryDelaysMs.length; attempt++) {
      if (!this.authed) throw new Error('signed-out');
      try {
        await this.deps.save(snapshot);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < this.retryDelaysMs.length) {
          this.setStatus('retrying');
          await this.delay(this.retryDelaysMs[attempt]);
        }
      }
    }
    throw lastError;
  }
}
