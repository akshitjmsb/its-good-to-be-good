import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';

export const publicKey = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    return process.env.WEB_PUSH_PUBLIC_KEY ?? null;
  },
});

export const subscribe = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, subscription) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    const now = Date.now();

    // A browser endpoint belongs to one signed-in account at a time. Moving it
    // here prevents notifications crossing accounts on a shared device.
    const endpointRows = await ctx.db
      .query('todoPushSubscriptions')
      .withIndex('by_endpoint', q => q.eq('endpoint', subscription.endpoint))
      .collect();
    for (const row of endpointRows) {
      if (row.userId !== userId) await ctx.db.delete(row._id);
    }

    const existing = endpointRows.find(row => row.userId === userId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
        updatedAt: now,
      });
      return;
    }
    await ctx.db.insert('todoPushSubscriptions', {
      userId,
      ...subscription,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deliveryContext = internalQuery({
  args: {
    userId: v.id('users'),
    clientId: v.string(),
    remindAt: v.string(),
    reminderRevision: v.string(),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db
      .query('tasks')
      .withIndex('by_user_client', q =>
        q.eq('userId', args.userId).eq('clientId', args.clientId)
      )
      .unique();
    if (
      !task ||
      task.completed ||
      task.remindAt !== args.remindAt ||
      task.reminderRevision !== args.reminderRevision
    ) {
      return null;
    }
    const subscriptions = await ctx.db
      .query('todoPushSubscriptions')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .collect();
    return {
      title: task.text,
      subscriptions: subscriptions.map(row => ({
        endpoint: row.endpoint,
        p256dh: row.p256dh,
        auth: row.auth,
      })),
    };
  },
});

export const removeExpired = internalMutation({
  args: { endpoints: v.array(v.string()) },
  handler: async (ctx, { endpoints }) => {
    for (const endpoint of new Set(endpoints)) {
      const rows = await ctx.db
        .query('todoPushSubscriptions')
        .withIndex('by_endpoint', q => q.eq('endpoint', endpoint))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }
  },
});
