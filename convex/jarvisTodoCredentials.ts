/** Authenticated owner controls for Jarvis's revocable To-Do credential. */

import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

const TOKEN_HASH = /^[a-f0-9]{64}$/;
const SCOPES = ['todo.read', 'todo.write', 'todo.delete'];

export const issue = mutation({
  args: {
    tokenHash: v.string(),
    label: v.string(),
  },
  handler: async (ctx, { tokenHash, label }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    const normalizedHash = tokenHash.trim().toLowerCase();
    const normalizedLabel = label.trim().slice(0, 80) || 'Jarvis on Mac mini';
    if (!TOKEN_HASH.test(normalizedHash))
      throw new Error('Invalid credential digest');

    const duplicate = await ctx.db
      .query('jarvisTodoCredentials')
      .withIndex('by_token_hash', q => q.eq('tokenHash', normalizedHash))
      .unique();
    if (duplicate) throw new Error('Credential already registered');

    const credentials = await ctx.db
      .query('jarvisTodoCredentials')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();
    const active = credentials.filter(item => item.revokedAt === undefined);
    if (active.length >= 5)
      throw new Error('Revoke an old Jarvis credential before adding another');

    const createdAt = Date.now();
    const credentialId = await ctx.db.insert('jarvisTodoCredentials', {
      userId,
      tokenHash: normalizedHash,
      label: normalizedLabel,
      scopes: SCOPES,
      createdAt,
    });
    return { credentialId, label: normalizedLabel, scopes: SCOPES, createdAt };
  },
});

export const list = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    const credentials = await ctx.db
      .query('jarvisTodoCredentials')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();
    return credentials
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(item => ({
        id: item._id,
        label: item.label,
        scopes: item.scopes,
        createdAt: item.createdAt,
        lastUsedAt: item.lastUsedAt ?? null,
        revokedAt: item.revokedAt ?? null,
      }));
  },
});

export const revoke = mutation({
  args: { credentialId: v.id('jarvisTodoCredentials') },
  handler: async (ctx, { credentialId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');
    const credential = await ctx.db.get(credentialId);
    if (!credential || credential.userId !== userId)
      throw new Error('Credential not found');
    if (credential.revokedAt === undefined) {
      await ctx.db.patch(credentialId, { revokedAt: Date.now() });
    }
    return { revoked: true, credentialId };
  },
});
