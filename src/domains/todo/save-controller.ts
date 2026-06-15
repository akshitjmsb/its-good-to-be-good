/**
 * Serialized, crash-safe save controller for the To Do module.
 *
 * Design goals (each maps to a previously-real data-loss bug):
 *
 *  - The "dirty" signal is *derived* (`mutationSeq > savedSeq`), so it is only
 *    ever cleared by a confirmed successful save — never reset before the
 *    network call the way the old `dirty = false` ahead of `await` did.
 *  - A failed save retries with exponential backoff; after the last attempt it
 *    enters an `offline` state and leaves the work queued (savedSeq unchanged),
 *    so the WAL and the sync guard both keep protecting it.
 *  - A mutation that lands mid-save bumps `mutationSeq`, so the flush loop runs
 *    again and the latest state is written — overlapping edits converge.
 *  - Saving is gated on both a confirmed initial load and a live auth session;
 *    sign-out pauses saves, re-auth resumes and flushes whatever is pending.
 *
 * All time/IO is injected (`save`, `getSnapshot`, `delay`) so the whole thing
 * is deterministically testable without a browser or real timers.
 */

import type { WalSnapshot } from './wal';

export type SaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'retrying'
  | 'offline'
  | 'signed-out';

export interface SaveControllerDeps {
  /** Perform the actual persistence. Must reject on failure. */
  save: (snapshot: WalSnapshot) => Promise<void>;
  /** Snapshot the current tasks + pending delete tombstones. */
  getSnapshot: () => WalSnapshot;
  /** Called after each confirmed save so the caller can drop flushed
   *  tombstones and (when fully clean) clear the WAL. */
  onPersisted?: (snapshot: WalSnapshot) => void;
  /** Status transitions, for the UI indicator. */
  onStatus?: (status: SaveStatus) => void;
  /** Backoff sleep — injected so tests can resolve instantly. */
  delay?: (ms: number) => Promise<void>;
  /** Retry backoff schedule after the first attempt. Default 1s / 2s / 4s. */
  retryDelaysMs?: number[];
}

export class SaveController {
  private readonly deps: SaveControllerDeps;
  private readonly delay: (ms: number) => Promise<void>;
  private readonly retryDelaysMs: number[];

  private saving = false;
  private mutationSeq = 0;
  private savedSeq = 0;
  private loaded = false;
  private authed = true;

  /** True after the retry budget is exhausted; cleared by the next success. */
  saveError = false;
  status: SaveStatus = 'idle';

  constructor(deps: SaveControllerDeps) {
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

  /** Record a local mutation and (re)start the flush loop. */
  notifyMutation(): void {
    this.mutationSeq++;
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

  private async saveWithRetry(snapshot: WalSnapshot): Promise<void> {
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
