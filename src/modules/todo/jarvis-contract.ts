/** Pure, deterministic task transitions used by the Jarvis service bridge. */

export type JarvisTaskRecord = {
  clientId: string;
  text: string;
  note: string;
  completed: boolean;
  position: number;
  parentId: string | null;
  remindAt: string | null;
  reminderRevision: string | null;
  updatedAt: string;
  createdAt: string;
};

export type JarvisTaskAction =
  | 'create'
  | 'update'
  | 'complete'
  | 'reopen'
  | 'delete';

export type JarvisTaskMutation = {
  action: JarvisTaskAction;
  taskId?: string;
  text?: string;
  note?: string;
  parentId?: string | null;
  expectedUpdatedAt?: string;
  confirmed?: boolean;
};

export type JarvisTransition = {
  ok: boolean;
  state: 'observed' | 'failed';
  errorCode?: string;
  message: string;
  before: JarvisTaskRecord[];
  after: JarvisTaskRecord[];
  tasks: JarvisTaskRecord[];
};

function fail(
  tasks: JarvisTaskRecord[],
  errorCode: string,
  message: string,
  before: JarvisTaskRecord[] = []
): JarvisTransition {
  return {
    ok: false,
    state: 'failed',
    errorCode,
    message,
    before,
    after: before,
    tasks,
  };
}

export function sanitizeJarvisTaskText(input: string | undefined): string {
  return (
    (input ?? '')
      .replace(/\0/g, '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .trim()
      .slice(0, 200)
  );
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Jarvis accepts note text, never arbitrary HTML. */
export function jarvisNoteHtml(input: string | undefined): string {
  return escapeHtml((input ?? '').slice(0, 100_000)).replace(/\r?\n/g, '<br>');
}

function family(
  tasks: JarvisTaskRecord[],
  target: JarvisTaskRecord
): JarvisTaskRecord[] {
  if (target.parentId) {
    return tasks.filter(
      task =>
        task.clientId === target.clientId || task.clientId === target.parentId
    );
  }
  return tasks.filter(
    task =>
      task.clientId === target.clientId || task.parentId === target.clientId
  );
}

function reconcileCompletion(
  tasks: JarvisTaskRecord[],
  target: JarvisTaskRecord,
  completed: boolean,
  timestamp: string
): JarvisTaskRecord[] {
  const withCompletion = (
    task: JarvisTaskRecord,
    nextCompleted: boolean
  ): JarvisTaskRecord => ({
    ...task,
    completed: nextCompleted,
    updatedAt: timestamp,
    ...(nextCompleted ? { remindAt: null, reminderRevision: null } : {}),
  });
  let next = tasks.map(task =>
    task.clientId === target.clientId &&
    (task.completed !== completed || (completed && task.remindAt !== null))
      ? withCompletion(task, completed)
      : task
  );
  if (!target.parentId) {
    next = next.map(task =>
      task.parentId === target.clientId &&
      (task.completed !== completed || (completed && task.remindAt !== null))
        ? withCompletion(task, completed)
        : task
    );
  } else {
    const siblings = next.filter(task => task.parentId === target.parentId);
    const parentCompleted =
      siblings.length > 0 && siblings.every(task => task.completed);
    next = next.map(task =>
      task.clientId === target.parentId &&
      (task.completed !== parentCompleted ||
        (parentCompleted && task.remindAt !== null))
        ? withCompletion(task, parentCompleted)
        : task
    );
  }
  return next;
}

export function applyJarvisTaskMutation(
  current: JarvisTaskRecord[],
  mutation: JarvisTaskMutation,
  timestamp: string
): JarvisTransition {
  const tasks = current.map(task => ({ ...task }));

  if (mutation.action === 'create') {
    const taskId = (mutation.taskId ?? '').trim();
    const text = sanitizeJarvisTaskText(mutation.text);
    if (!taskId || taskId.length > 100)
      return fail(tasks, 'invalid_task_id', 'Not created: task id is invalid.');
    if (tasks.some(task => task.clientId === taskId))
      return fail(
        tasks,
        'task_exists',
        'Not created: that task id already exists.'
      );
    if (!text)
      return fail(
        tasks,
        'invalid_text',
        'Not created: the task title is empty.'
      );
    const parentId = mutation.parentId ?? null;
    if (
      parentId &&
      !tasks.some(task => task.clientId === parentId && !task.parentId)
    ) {
      return fail(
        tasks,
        'parent_not_found',
        'Not created: the selected parent task no longer exists.'
      );
    }
    const peers = tasks.filter(task => task.parentId === parentId);
    const created: JarvisTaskRecord = {
      clientId: taskId,
      text,
      note: jarvisNoteHtml(mutation.note),
      completed: false,
      position:
        peers.reduce((max, task) => Math.max(max, task.position), -1) + 1,
      parentId,
      remindAt: null,
      reminderRevision: null,
      updatedAt: timestamp,
      createdAt: timestamp,
    };
    return {
      ok: true,
      state: 'observed',
      message: `Created task: ${created.text}.`,
      before: [],
      after: [created],
      tasks: [...tasks, created],
    };
  }

  const target = tasks.find(task => task.clientId === mutation.taskId);
  if (!target)
    return fail(
      tasks,
      'task_not_found',
      'Not changed: that task no longer exists.'
    );
  const before = family(tasks, target).map(task => ({ ...task }));
  if (!mutation.expectedUpdatedAt) {
    return fail(
      tasks,
      'precondition_required',
      'Not changed: a current task revision is required.',
      before
    );
  }
  if (mutation.expectedUpdatedAt !== target.updatedAt) {
    return fail(
      tasks,
      'revision_conflict',
      'Not changed: the task changed on another device. Please try again.',
      before
    );
  }

  if (mutation.action === 'delete') {
    if (mutation.confirmed !== true) {
      return fail(
        tasks,
        'confirmation_required',
        `Not deleted: confirm deletion of ${target.text}.`,
        before
      );
    }
    const next = tasks.filter(
      task =>
        task.clientId !== target.clientId && task.parentId !== target.clientId
    );
    return {
      ok: true,
      state: 'observed',
      message: `Deleted task: ${target.text}.`,
      before,
      after: [],
      tasks: next,
    };
  }

  if (mutation.action === 'complete' || mutation.action === 'reopen') {
    const completed = mutation.action === 'complete';
    const next = reconcileCompletion(tasks, target, completed, timestamp);
    const updatedTarget = next.find(task => task.clientId === target.clientId)!;
    const verb = completed ? 'complete' : 'open';
    return {
      ok: true,
      state: 'observed',
      message:
        target.completed === completed
          ? `Task was already ${verb}: ${target.text}.`
          : `Marked task ${verb}: ${target.text}.`,
      before,
      after: family(next, updatedTarget),
      tasks: next,
    };
  }

  if (mutation.action === 'update') {
    const hasText = mutation.text !== undefined;
    const hasNote = mutation.note !== undefined;
    if (!hasText && !hasNote)
      return fail(
        tasks,
        'empty_update',
        'Not changed: no update was supplied.',
        before
      );
    const text = hasText ? sanitizeJarvisTaskText(mutation.text) : target.text;
    if (!text)
      return fail(
        tasks,
        'invalid_text',
        'Not changed: the task title is empty.',
        before
      );
    const updated: JarvisTaskRecord = {
      ...target,
      text,
      note: hasNote ? jarvisNoteHtml(mutation.note) : target.note,
      updatedAt: timestamp,
    };
    const next = tasks.map(task =>
      task.clientId === target.clientId ? updated : task
    );
    return {
      ok: true,
      state: 'observed',
      message: `Updated task: ${updated.text}.`,
      before,
      after: family(next, updated),
      tasks: next,
    };
  }

  return fail(
    tasks,
    'unsupported_action',
    'Not changed: unsupported action.',
    before
  );
}
