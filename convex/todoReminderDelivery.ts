'use node';

import { v } from 'convex/values';
import webPush from 'web-push';
import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

export const fire = internalAction({
  args: {
    userId: v.id('users'),
    clientId: v.string(),
    remindAt: v.string(),
    reminderRevision: v.string(),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(
      internal.todoReminders.deliveryContext,
      args
    );
    if (!context || context.subscriptions.length === 0) return;

    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    const subject = process.env.WEB_PUSH_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
      console.error('To Do reminder skipped: Web Push is not configured.');
      return;
    }
    webPush.setVapidDetails(subject, publicKey, privateKey);
    const payload = JSON.stringify({
      title: context.title,
      data: { url: `/todo.html?task=${encodeURIComponent(args.clientId)}` },
    });
    const expired: string[] = [];
    await Promise.all(
      context.subscriptions.map(async subscription => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
            { TTL: 60 * 60 * 24 }
          );
        } catch (error) {
          const statusCode =
            typeof error === 'object' && error !== null && 'statusCode' in error
              ? Number(error.statusCode)
              : 0;
          if (statusCode === 404 || statusCode === 410) {
            expired.push(subscription.endpoint);
          } else {
            console.error(
              'To Do reminder delivery failed:',
              statusCode || error
            );
          }
        }
      })
    );
    if (expired.length > 0) {
      await ctx.runMutation(internal.todoReminders.removeExpired, {
        endpoints: expired,
      });
    }
  },
});
