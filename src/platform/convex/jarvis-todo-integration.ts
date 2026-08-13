/** Browser-authenticated provisioning for Jarvis's revocable To-Do credential. */

import { api } from '../../../convex/_generated/api';
import { ensureFreshAuth } from '../auth/session';
import { convex } from './client';

export type JarvisTodoCredential = {
  id: string;
  label: string;
  scopes: string[];
  createdAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
};

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value)
  );
  return Array.from(new Uint8Array(hash), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

export function jarvisTodoApiUrl(): string {
  const deployment = String(import.meta.env.VITE_CONVEX_URL ?? '').replace(
    /\/$/,
    ''
  );
  return `${deployment.replace(/\.convex\.cloud$/, '.convex.site')}/api/jarvis/todos`;
}

export async function listJarvisTodoCredentials(): Promise<
  JarvisTodoCredential[]
> {
  await ensureFreshAuth();
  return (await convex.query(
    api.jarvisTodoCredentials.list,
    {}
  )) as JarvisTodoCredential[];
}

export async function issueJarvisTodoCredential(label = 'Jarvis on Mac mini') {
  if (!crypto?.getRandomValues || !crypto?.subtle) {
    throw new Error(
      'Secure credential generation is unavailable in this browser'
    );
  }
  const apiUrl = jarvisTodoApiUrl();
  if (!apiUrl.startsWith('https://') || !apiUrl.includes('.convex.site/')) {
    throw new Error('The Convex HTTP deployment URL is not configured');
  }
  const secret = `jtd_${base64Url(crypto.getRandomValues(new Uint8Array(32)))}`;
  const tokenHash = await digest(secret);
  await ensureFreshAuth();
  const credential = await convex.mutation(api.jarvisTodoCredentials.issue, {
    tokenHash,
    label,
  });
  return { secret, apiUrl, credential };
}

export async function revokeJarvisTodoCredential(
  credentialId: string
): Promise<void> {
  await ensureFreshAuth();
  await convex.mutation(api.jarvisTodoCredentials.revoke, {
    credentialId: credentialId as never,
  });
}
