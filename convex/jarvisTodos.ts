/** Narrow, credential-gated service API used by the owner's local Jarvis. */

import { v } from 'convex/values';
import { httpAction, internalMutation } from './_generated/server';
import { internal } from './_generated/api';
import {
  applyJarvisTaskMutation,
  type JarvisTaskMutation,
  type JarvisTaskRecord,
} from '../src/modules/todo/jarvis-contract';

const requestValidator = v.object({
  requestId: v.string(),
  action: v.union(
    v.literal('list'),
    v.literal('create'),
    v.literal('update'),
    v.literal('complete'),
    v.literal('reopen'),
    v.literal('delete')
  ),
  taskId: v.optional(v.string()),
  text: v.optional(v.string()),
  note: v.optional(v.string()),
  parentId: v.optional(v.union(v.string(), v.null())),
  expectedUpdatedAt: v.optional(v.string()),
  confirmed: v.optional(v.boolean()),
});

type RequestArgs = {
  requestId: string;
  action: 'list' | 'create' | 'update' | 'complete' | 'reopen' | 'delete';
  taskId?: string;
  text?: string;
  note?: string;
  parentId?: string | null;
  expectedUpdatedAt?: string;
  confirmed?: boolean;
};

type ServiceResponse = {
  ok: boolean;
  state: 'observed' | 'failed';
  requestId: string;
  action: RequestArgs['action'];
  message: string;
  errorCode?: string;
  before: JarvisTaskRecord[];
  after: JarvisTaskRecord[];
  tasks?: JarvisTaskRecord[];
  deduplicated?: boolean;
};

function taskView(row: {
  clientId: string;
  text: string;
  note?: string;
  completed: boolean;
  position: number;
  parentId: string | null;
  remindAt?: string;
  reminderRevision?: string;
  updatedAt: string;
  createdAt: string;
}): JarvisTaskRecord {
  return {
    clientId: row.clientId,
    text: row.text,
    note: row.note ?? '',
    completed: row.completed,
    position: row.position,
    parentId: row.parentId,
    remindAt: row.remindAt ?? null,
    reminderRevision: row.reminderRevision ?? null,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

function canonicalRequest(request: RequestArgs): string {
  return JSON.stringify({
    action: request.action,
    taskId: request.taskId ?? null,
    text: request.text ?? null,
    note: request.note ?? null,
    parentId: request.parentId ?? null,
    expectedUpdatedAt: request.expectedUpdatedAt ?? null,
    confirmed: request.confirmed ?? false,
  });
}

function requiredScope(action: RequestArgs['action']): string {
  if (action === 'list') return 'todo.read';
  if (action === 'delete') return 'todo.delete';
  return 'todo.write';
}

function response(
  request: RequestArgs,
  fields: Omit<ServiceResponse, 'requestId' | 'action'>
): ServiceResponse {
  return { requestId: request.requestId, action: request.action, ...fields };
}

export const execute = internalMutation({
  args: {
    tokenHash: v.string(),
    requestHash: v.string(),
    request: requestValidator,
  },
  handler: async (
    ctx,
    { tokenHash, requestHash, request }
  ): Promise<ServiceResponse> => {
    if (!/^[a-f0-9]{64}$/.test(tokenHash)) {
      return response(request, {
        ok: false,
        state: 'failed',
        errorCode: 'unauthorized',
        message: 'Not authorized: invalid Jarvis credential.',
        before: [],
        after: [],
      });
    }
    if (!request.requestId.trim() || request.requestId.length > 160) {
      return response(request, {
        ok: false,
        state: 'failed',
        errorCode: 'invalid_request_id',
        message: 'Not processed: request id is invalid.',
        before: [],
        after: [],
      });
    }

    const credential = await ctx.db
      .query('jarvisTodoCredentials')
      .withIndex('by_token_hash', q => q.eq('tokenHash', tokenHash))
      .unique();
    if (!credential || credential.revokedAt !== undefined) {
      return response(request, {
        ok: false,
        state: 'failed',
        errorCode: 'unauthorized',
        message: 'Not authorized: Jarvis credential is missing or revoked.',
        before: [],
        after: [],
      });
    }
    const scope = requiredScope(request.action);
    if (!credential.scopes.includes(scope)) {
      return response(request, {
        ok: false,
        state: 'failed',
        errorCode: 'forbidden',
        message: `Not authorized: ${scope} permission is required.`,
        before: [],
        after: [],
      });
    }

    const now = Date.now();
    await ctx.db.patch(credential._id, { lastUsedAt: now });
    const rows = await ctx.db
      .query('tasks')
      .withIndex('by_user', q => q.eq('userId', credential.userId))
      .collect();
    const tasks = rows
      .map(taskView)
      .sort(
        (a, b) =>
          a.position - b.position || a.createdAt.localeCompare(b.createdAt)
      );

    if (request.action === 'list') {
      return response(request, {
        ok: true,
        state: 'observed',
        message: `Read ${tasks.length} task${tasks.length === 1 ? '' : 's'}.`,
        before: [],
        after: [],
        tasks,
      });
    }

    if (!/^[a-f0-9]{64}$/.test(requestHash)) {
      return response(request, {
        ok: false,
        state: 'failed',
        errorCode: 'invalid_request_hash',
        message: 'Not processed: request integrity check failed.',
        before: [],
        after: [],
      });
    }
    const existingReceipt = await ctx.db
      .query('jarvisTodoCommandReceipts')
      .withIndex('by_user_request', q =>
        q.eq('userId', credential.userId).eq('requestId', request.requestId)
      )
      .unique();
    if (existingReceipt) {
      if (existingReceipt.requestHash !== requestHash) {
        return response(request, {
          ok: false,
          state: 'failed',
          errorCode: 'request_id_reused',
          message:
            'Not changed: that request id was already used for a different command.',
          before: [],
          after: [],
        });
      }
      return {
        ...(JSON.parse(existingReceipt.responseJson) as ServiceResponse),
        deduplicated: true,
      };
    }

    const persistReceipt = async (
      result: ServiceResponse
    ): Promise<ServiceResponse> => {
      await ctx.db.insert('jarvisTodoCommandReceipts', {
        userId: credential.userId,
        credentialId: credential._id,
        requestId: request.requestId,
        requestHash,
        action: request.action,
        state: result.state,
        responseJson: JSON.stringify(result),
        createdAt: now,
      });
      return result;
    };

    if (request.action === 'create' && request.taskId) {
      const tombstone = await ctx.db
        .query('taskTombstones')
        .withIndex('by_user_client', q =>
          q.eq('userId', credential.userId).eq('clientId', request.taskId!)
        )
        .unique();
      if (tombstone) {
        return persistReceipt(
          response(request, {
            ok: false,
            state: 'failed',
            errorCode: 'task_id_retired',
            message: 'Not created: that task id belongs to a deleted task.',
            before: [],
            after: [],
          })
        );
      }
    }

    const latestRevision = tasks.reduce((latest, task) => {
      const parsed = Date.parse(task.updatedAt);
      return Number.isNaN(parsed) ? latest : Math.max(latest, parsed);
    }, 0);
    const timestamp = new Date(Math.max(now, latestRevision + 1)).toISOString();
    const transition = applyJarvisTaskMutation(
      tasks,
      request as JarvisTaskMutation,
      timestamp
    );
    const serviceResult = response(request, {
      ok: transition.ok,
      state: transition.state,
      errorCode: transition.errorCode,
      message: transition.message,
      before: transition.before,
      after: transition.after,
    });
    if (!transition.ok) return persistReceipt(serviceResult);

    const nextById = new Map(
      transition.tasks.map(task => [task.clientId, task])
    );
    const rowById = new Map(rows.map(row => [row.clientId, row]));
    for (const row of rows) {
      const next = nextById.get(row.clientId);
      if (!next) {
        await ctx.db.delete(row._id);
        const tombstone = await ctx.db
          .query('taskTombstones')
          .withIndex('by_user_client', q =>
            q.eq('userId', credential.userId).eq('clientId', row.clientId)
          )
          .unique();
        if (tombstone)
          await ctx.db.patch(tombstone._id, { deletedAt: timestamp });
        else
          await ctx.db.insert('taskTombstones', {
            userId: credential.userId,
            clientId: row.clientId,
            deletedAt: timestamp,
          });
        continue;
      }
      const original = taskView(row);
      if (JSON.stringify(original) !== JSON.stringify(next)) {
        await ctx.db.patch(row._id, {
          text: next.text,
          note: next.note,
          completed: next.completed,
          position: next.position,
          parentId: next.parentId,
          remindAt: next.remindAt ?? undefined,
          reminderRevision: next.reminderRevision ?? undefined,
          updatedAt: next.updatedAt,
        });
      }
    }
    for (const next of transition.tasks) {
      if (rowById.has(next.clientId)) continue;
      await ctx.db.insert('tasks', {
        userId: credential.userId,
        clientId: next.clientId,
        text: next.text,
        note: next.note,
        completed: next.completed,
        position: next.position,
        parentId: next.parentId,
        remindAt: next.remindAt ?? undefined,
        reminderRevision: next.reminderRevision ?? undefined,
        updatedAt: next.updatedAt,
        createdAt: next.createdAt,
      });
    }

    // Read our writes before returning "observed". Convex commits this mutation
    // atomically, while Jarvis independently re-reads after the HTTP response.
    for (const expected of transition.after) {
      const observed = await ctx.db
        .query('tasks')
        .withIndex('by_user_client', q =>
          q.eq('userId', credential.userId).eq('clientId', expected.clientId)
        )
        .unique();
      if (
        !observed ||
        JSON.stringify(taskView(observed)) !== JSON.stringify(expected)
      ) {
        throw new Error('Postcondition verification failed');
      }
    }
    if (request.action === 'delete') {
      for (const deleted of transition.before) {
        const observed = await ctx.db
          .query('tasks')
          .withIndex('by_user_client', q =>
            q.eq('userId', credential.userId).eq('clientId', deleted.clientId)
          )
          .unique();
        if (observed)
          throw new Error('Delete postcondition verification failed');
      }
    }
    return persistReceipt(serviceResult);
  },
});

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

function jsonResponse(body: ServiceResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function isRequestArgs(value: unknown): value is RequestArgs {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  const actions = new Set([
    'list',
    'create',
    'update',
    'complete',
    'reopen',
    'delete',
  ]);
  if (
    typeof item.requestId !== 'string' ||
    typeof item.action !== 'string' ||
    !actions.has(item.action)
  ) {
    return false;
  }
  const stringFields = ['taskId', 'text', 'note', 'expectedUpdatedAt'];
  if (
    stringFields.some(
      field => item[field] !== undefined && typeof item[field] !== 'string'
    )
  )
    return false;
  if (
    item.parentId !== undefined &&
    item.parentId !== null &&
    typeof item.parentId !== 'string'
  )
    return false;
  return item.confirmed === undefined || typeof item.confirmed === 'boolean';
}

export const endpoint = httpAction(async (ctx, httpRequest) => {
  if (httpRequest.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { Allow: 'POST' },
    });
  }
  const authorization = httpRequest.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';
  if (!token.startsWith('jtd_') || token.length > 200) {
    return jsonResponse(
      {
        ok: false,
        state: 'failed',
        requestId: '',
        action: 'list',
        errorCode: 'unauthorized',
        message: 'Not authorized: missing Jarvis To-Do credential.',
        before: [],
        after: [],
      },
      401
    );
  }

  const raw = await httpRequest.text();
  if (raw.length > 110_000) {
    return jsonResponse(
      {
        ok: false,
        state: 'failed',
        requestId: '',
        action: 'list',
        errorCode: 'payload_too_large',
        message: 'Not processed: request is too large.',
        before: [],
        after: [],
      },
      413
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return jsonResponse(
      {
        ok: false,
        state: 'failed',
        requestId: '',
        action: 'list',
        errorCode: 'invalid_json',
        message: 'Not processed: malformed request.',
        before: [],
        after: [],
      },
      400
    );
  }
  if (!isRequestArgs(parsed)) {
    return jsonResponse(
      {
        ok: false,
        state: 'failed',
        requestId: '',
        action: 'list',
        errorCode: 'invalid_request',
        message: 'Not processed: request fields are invalid.',
        before: [],
        after: [],
      },
      400
    );
  }
  const request = parsed;
  const tokenHash = await sha256(token);
  const requestHash = await sha256(canonicalRequest(request));
  const result = await ctx.runMutation(internal.jarvisTodos.execute, {
    tokenHash,
    requestHash,
    request,
  });
  const status =
    result.errorCode === 'unauthorized'
      ? 401
      : result.errorCode === 'forbidden'
        ? 403
        : 200;
  return jsonResponse(result, status);
});
