import { describe, expect, it } from 'vitest';
import {
  applyJarvisTaskMutation,
  type JarvisTaskRecord,
} from '../jarvis-contract';

const NOW = '2026-08-12T10:00:00.000Z';
const NEXT = '2026-08-12T10:00:01.000Z';

function task(overrides: Partial<JarvisTaskRecord> = {}): JarvisTaskRecord {
  return {
    clientId: 'task-1',
    text: 'Buy groceries',
    note: '',
    completed: false,
    position: 0,
    parentId: null,
    updatedAt: NOW,
    createdAt: NOW,
    ...overrides,
  };
}

describe('Jarvis To-Do contract', () => {
  it('creates a task with escaped plain-text notes', () => {
    const result = applyJarvisTaskMutation(
      [],
      {
        action: 'create',
        taskId: 'new-task',
        text: ' Call Rakesh ',
        note: '<script>x</script>\nTomorrow',
      },
      NEXT
    );
    expect(result.state).toBe('observed');
    expect(result.after[0]).toMatchObject({
      clientId: 'new-task',
      text: 'Call Rakesh',
    });
    expect(result.after[0].note).toBe(
      '&lt;script&gt;x&lt;/script&gt;<br>Tomorrow'
    );
  });

  it('rejects a stale write instead of overwriting another device', () => {
    const result = applyJarvisTaskMutation(
      [task()],
      {
        action: 'update',
        taskId: 'task-1',
        text: 'Changed',
        expectedUpdatedAt: 'stale',
      },
      NEXT
    );
    expect(result).toMatchObject({
      state: 'failed',
      errorCode: 'revision_conflict',
    });
    expect(result.tasks[0].text).toBe('Buy groceries');
  });

  it('cascades parent completion and reopening to children', () => {
    const tasks = [
      task(),
      task({ clientId: 'child', text: 'Buy milk', parentId: 'task-1' }),
    ];
    const completed = applyJarvisTaskMutation(
      tasks,
      {
        action: 'complete',
        taskId: 'task-1',
        expectedUpdatedAt: NOW,
      },
      NEXT
    );
    expect(completed.tasks.every(item => item.completed)).toBe(true);
    const reopened = applyJarvisTaskMutation(
      completed.tasks,
      {
        action: 'reopen',
        taskId: 'task-1',
        expectedUpdatedAt: NEXT,
      },
      '2026-08-12T10:00:02.000Z'
    );
    expect(reopened.tasks.every(item => !item.completed)).toBe(true);
  });

  it('reconciles the parent when the last child completes', () => {
    const tasks = [
      task(),
      task({
        clientId: 'child-a',
        text: 'A',
        parentId: 'task-1',
        completed: true,
      }),
      task({ clientId: 'child-b', text: 'B', parentId: 'task-1' }),
    ];
    const result = applyJarvisTaskMutation(
      tasks,
      {
        action: 'complete',
        taskId: 'child-b',
        expectedUpdatedAt: NOW,
      },
      NEXT
    );
    expect(
      result.tasks.find(item => item.clientId === 'task-1')?.completed
    ).toBe(true);
  });

  it('requires explicit confirmation before deleting a parent and its children', () => {
    const tasks = [task(), task({ clientId: 'child', parentId: 'task-1' })];
    const denied = applyJarvisTaskMutation(
      tasks,
      {
        action: 'delete',
        taskId: 'task-1',
        expectedUpdatedAt: NOW,
      },
      NEXT
    );
    expect(denied).toMatchObject({
      state: 'failed',
      errorCode: 'confirmation_required',
    });
    expect(denied.tasks).toHaveLength(2);

    const deleted = applyJarvisTaskMutation(
      tasks,
      {
        action: 'delete',
        taskId: 'task-1',
        expectedUpdatedAt: NOW,
        confirmed: true,
      },
      NEXT
    );
    expect(deleted.state).toBe('observed');
    expect(deleted.tasks).toEqual([]);
    expect(deleted.before).toHaveLength(2);
  });

  it('fails closed for a missing parent or target', () => {
    expect(
      applyJarvisTaskMutation(
        [],
        {
          action: 'create',
          taskId: 'child',
          text: 'Child',
          parentId: 'gone',
        },
        NEXT
      ).errorCode
    ).toBe('parent_not_found');
    expect(
      applyJarvisTaskMutation(
        [],
        {
          action: 'complete',
          taskId: 'gone',
          expectedUpdatedAt: NOW,
        },
        NEXT
      ).errorCode
    ).toBe('task_not_found');
  });
});
