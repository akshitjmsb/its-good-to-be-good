import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveController, type SaveStatus } from '../save-controller';
import type { WalSnapshot } from '../wal';
import type { Task } from '../../../types';

const settle = () => new Promise<void>(r => setTimeout(r, 0));

function makeTask(id: string): Task {
  return { id, text: id, completed: false, position: 0, parent_id: null };
}

describe('SaveController', () => {
  let snapshot: WalSnapshot;
  let saveImpl: (snap: WalSnapshot) => Promise<void>;
  let saveSpy: ReturnType<typeof vi.fn>;
  let delaySpy: ReturnType<typeof vi.fn>;
  let statuses: SaveStatus[];
  let persisted: WalSnapshot[];
  let controller: SaveController;

  beforeEach(() => {
    snapshot = { tasks: [makeTask('a')], deletedIds: [] };
    saveImpl = async () => {};
    saveSpy = vi.fn((snap: WalSnapshot) => saveImpl(snap));
    delaySpy = vi.fn(async () => {});
    statuses = [];
    persisted = [];
    controller = new SaveController({
      save: saveSpy as (snap: WalSnapshot) => Promise<void>,
      getSnapshot: () => snapshot,
      onPersisted: (snap) => persisted.push(snap),
      onStatus: (s) => statuses.push(s),
      delay: delaySpy as (ms: number) => Promise<void>,
      retryDelaysMs: [1000, 2000, 4000],
    });
  });

  afterEach(() => vi.clearAllMocks());

  it('does not save until a clean load has unlocked it', async () => {
    controller.notifyMutation();
    await settle();
    expect(saveSpy).not.toHaveBeenCalled();
    expect(controller.dirty).toBe(true);

    controller.setLoaded(true);
    await settle();
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(controller.dirty).toBe(false);
  });

  it('on success, clears dirty and flashes saved', async () => {
    controller.setLoaded(true);
    controller.notifyMutation();
    await settle();
    expect(saveSpy).toHaveBeenCalledWith(snapshot);
    expect(controller.dirty).toBe(false);
    expect(controller.saveError).toBe(false);
    expect(persisted).toHaveLength(1);
    expect(statuses).toContain('saving');
    expect(statuses.at(-1)).toBe('saved');
  });

  it('retries with 1s/2s/4s backoff, then goes offline and PRESERVES dirty', async () => {
    saveImpl = async () => { throw new Error('network'); };
    controller.setLoaded(true);
    controller.notifyMutation();
    await settle();

    // 1 initial attempt + 3 retries = 4 calls.
    expect(saveSpy).toHaveBeenCalledTimes(4);
    expect(delaySpy.mock.calls.map(c => c[0])).toEqual([1000, 2000, 4000]);
    expect(statuses).toContain('retrying');
    expect(statuses.at(-1)).toBe('offline');

    // The crucial invariant: a failed save must NOT clear dirty.
    expect(controller.saveError).toBe(true);
    expect(controller.dirty).toBe(true);
  });

  it('a mutation that lands mid-save makes the queue flush again', async () => {
    let calls = 0;
    saveImpl = async () => {
      calls++;
      if (calls === 1) controller.notifyMutation(); // arrives during the first save
    };
    controller.setLoaded(true);
    controller.notifyMutation();
    await settle();

    expect(saveSpy).toHaveBeenCalledTimes(2);
    expect(controller.dirty).toBe(false);
  });

  it('recovers after an offline spell when retry() is called', async () => {
    saveImpl = async () => { throw new Error('down'); };
    controller.setLoaded(true);
    controller.notifyMutation();
    await settle();
    expect(controller.saveError).toBe(true);

    saveImpl = async () => {}; // network back
    controller.retry();
    await settle();
    expect(controller.saveError).toBe(false);
    expect(controller.dirty).toBe(false);
    expect(statuses.at(-1)).toBe('saved');
  });

  it('pauses saves on sign-out and resumes + flushes on re-auth', async () => {
    controller.setLoaded(true);
    controller.notifyMutation();
    await settle();
    expect(saveSpy).toHaveBeenCalledTimes(1);

    // Sign out: a new mutation must not hit the network.
    controller.setAuthed(false);
    expect(controller.status).toBe('signed-out');
    controller.notifyMutation();
    await settle();
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(controller.dirty).toBe(true);

    // Re-auth: the pending mutation flushes.
    controller.setAuthed(true);
    await settle();
    expect(saveSpy).toHaveBeenCalledTimes(2);
    expect(controller.dirty).toBe(false);
  });
});
