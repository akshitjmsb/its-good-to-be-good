import { describe, expect, it } from 'vitest';
import {
  applyCompletion,
  canSync,
  childrenOf,
  mergeTasks,
  reindex,
  topLevel,
  type SyncGuardState,
} from '../model';
import type { Task } from '../../../types';

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    text: overrides.id,
    completed: false,
    position: 0,
    parent_id: null,
    ...overrides,
  };
}

describe('reindex', () => {
  it('collapses ties and gaps to a dense 0..n sequence', () => {
    const out = reindex([
      task({ id: 'a', position: 5 }),
      task({ id: 'b', position: 5 }), // tie with a
      task({ id: 'c', position: 9 }),
    ]);
    const byId = Object.fromEntries(out.map(t => [t.id, t.position]));
    expect(new Set(Object.values(byId)).size).toBe(3); // no duplicate positions
    expect(Object.values(byId).sort()).toEqual([0, 1, 2]);
  });

  it('breaks position ties deterministically by id (stable across runs)', () => {
    const a = [task({ id: 'zzz', position: 0 }), task({ id: 'aaa', position: 0 })];
    const first = reindex(a).sort((x, y) => x.position - y.position).map(t => t.id);
    const second = reindex([...a].reverse()).sort((x, y) => x.position - y.position).map(t => t.id);
    expect(first).toEqual(second); // order is input-independent
    expect(first[0]).toBe('aaa'); // 'aaa' < 'zzz'
  });

  it('reindexes each parent group independently and does not mutate input', () => {
    const input = [
      task({ id: 'p', position: 3 }),
      task({ id: 'c1', parent_id: 'p', position: 7 }),
      task({ id: 'c2', parent_id: 'p', position: 2 }),
    ];
    const out = reindex(input);
    expect(input[0].position).toBe(3); // input untouched
    const kids = out.filter(t => t.parent_id === 'p').sort((a, b) => a.position - b.position);
    expect(kids.map(k => k.id)).toEqual(['c2', 'c1']);
    expect(kids.map(k => k.position)).toEqual([0, 1]);
  });

  it('keeps position independent of completion (completed does not move position)', () => {
    const out = reindex([
      task({ id: 'a', position: 0, completed: true }),
      task({ id: 'b', position: 1 }),
    ]);
    expect(out.find(t => t.id === 'a')!.position).toBe(0);
  });
});

describe('ordering helpers', () => {
  it('topLevel sinks completed tasks below incomplete', () => {
    const ordered = topLevel([
      task({ id: 'done', position: 0, completed: true }),
      task({ id: 'open', position: 1 }),
    ]);
    expect(ordered.map(t => t.id)).toEqual(['open', 'done']);
  });

  it('childrenOf returns only the given parent’s kids in order', () => {
    const tasks = [
      task({ id: 'p1' }),
      task({ id: 'a', parent_id: 'p1', position: 1 }),
      task({ id: 'b', parent_id: 'p1', position: 0 }),
      task({ id: 'x', parent_id: 'p2', position: 0 }),
    ];
    expect(childrenOf(tasks, 'p1').map(t => t.id)).toEqual(['b', 'a']);
    expect(childrenOf(tasks, undefined)).toEqual([]);
  });
});

describe('applyCompletion — bidirectional cascade', () => {
  const tree = () => [
    task({ id: 'p' }),
    task({ id: 'c1', parent_id: 'p' }),
    task({ id: 'c2', parent_id: 'p' }),
  ];

  it('completing a parent completes all children', () => {
    const out = applyCompletion(tree(), 'p', true, '2026-01-01T00:00:00.000Z');
    expect(out.every(t => t.completed)).toBe(true);
  });

  it('un-completing a parent un-completes all children', () => {
    const allDone = tree().map(t => ({ ...t, completed: true }));
    const out = applyCompletion(allDone, 'p', false, '2026-01-01T00:00:00.000Z');
    expect(out.every(t => !t.completed)).toBe(true);
  });

  it('completing the last incomplete child auto-completes the parent', () => {
    const oneLeft = [
      task({ id: 'p' }),
      task({ id: 'c1', parent_id: 'p', completed: true }),
      task({ id: 'c2', parent_id: 'p', completed: false }),
    ];
    const out = applyCompletion(oneLeft, 'c2', true, '2026-01-01T00:00:00.000Z');
    expect(out.find(t => t.id === 'p')!.completed).toBe(true);
  });

  it('un-completing a child auto-uncompletes a completed parent', () => {
    const allDone = tree().map(t => ({ ...t, completed: true }));
    const out = applyCompletion(allDone, 'c1', false, '2026-01-01T00:00:00.000Z');
    expect(out.find(t => t.id === 'p')!.completed).toBe(false);
  });

  it('bumps updated_at only on tasks whose completion changed', () => {
    const ts = '2026-02-02T00:00:00.000Z';
    const out = applyCompletion(tree(), 'p', true, ts);
    // p, c1, c2 all flipped → all get the new ts
    expect(out.every(t => t.updated_at === ts)).toBe(true);
  });

  it('is a no-op for an unknown id', () => {
    const input = tree();
    expect(applyCompletion(input, 'nope', true, 'x')).toBe(input);
  });
});

describe('mergeTasks — non-destructive sync', () => {
  const T = '2026-03-03T00:00:00.000Z';
  const LATER = '2026-03-03T01:00:00.000Z';

  it('adopts a task that only exists on the server (added on another device)', () => {
    const merged = mergeTasks([], [task({ id: 'remote', updated_at: T })], []);
    expect(merged.map(t => t.id)).toEqual(['remote']);
  });

  it('keeps a local-only task (a pending add not yet on the server)', () => {
    const merged = mergeTasks([task({ id: 'local', updated_at: T })], [], []);
    expect(merged.map(t => t.id)).toEqual(['local']);
  });

  it('two-client scenario: both added a task → merge keeps both, never overwrites', () => {
    const local = [task({ id: 'mine', text: 'mine', updated_at: T })];
    const server = [task({ id: 'theirs', text: 'theirs', updated_at: T })];
    const merged = mergeTasks(local, server, []);
    expect(merged.map(t => t.id).sort()).toEqual(['mine', 'theirs']);
  });

  it('resolves a conflict by later updated_at (server newer wins)', () => {
    const local = [task({ id: 'x', text: 'old', updated_at: T })];
    const server = [task({ id: 'x', text: 'new', updated_at: LATER })];
    expect(mergeTasks(local, server, [])[0].text).toBe('new');
  });

  it('resolves a conflict by later updated_at (local newer / unsaved edit wins)', () => {
    const local = [task({ id: 'x', text: 'my unsaved edit', updated_at: LATER })];
    const server = [task({ id: 'x', text: 'stale', updated_at: T })];
    expect(mergeTasks(local, server, [])[0].text).toBe('my unsaved edit');
  });

  it('keeps a rich note with the record that wins a conflict', () => {
    const local = [task({ id: 'x', note: '<p>older</p>', updated_at: T })];
    const server = [task({ id: 'x', note: '<p>newer note</p>', updated_at: LATER })];
    expect(mergeTasks(local, server)[0]?.note).toBe('<p>newer note</p>');
  });

  it('never resurrects a tombstoned id, even if the server still has it', () => {
    const local: Task[] = [];
    const server = [task({ id: 'deleted', updated_at: T })];
    const merged = mergeTasks(local, server, ['deleted']);
    expect(merged).toEqual([]);
  });

  it('drops a local-only record during a clean background sync', () => {
    const merged = mergeTasks([task({ id: 'deleted-remotely', updated_at: T })], [], [], {
      keepLocalOnly: false,
    });
    expect(merged).toEqual([]);
  });
});

describe('canSync guard', () => {
  const ok: SyncGuardState = {
    editingId: null,
    noteEditorActive: false,
    subtaskInputActive: false,
    isDragging: false,
    saving: false,
    dirty: false,
    saveError: false,
    signedOut: false,
  };

  it('allows sync when nothing is in flight', () => {
    expect(canSync(ok)).toBe(true);
  });

  it.each([
    ['editingId', { editingId: 'x' }],
    ['noteEditorActive', { noteEditorActive: true }],
    ['subtaskInputActive', { subtaskInputActive: true }],
    ['isDragging', { isDragging: true }],
    ['saving', { saving: true }],
    ['dirty', { dirty: true }],
    ['saveError', { saveError: true }],
    ['signedOut', { signedOut: true }],
  ])('blocks sync while %s is set', (_label, patch) => {
    expect(canSync({ ...ok, ...(patch as Partial<SyncGuardState>) })).toBe(false);
  });
});
