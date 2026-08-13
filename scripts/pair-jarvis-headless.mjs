#!/usr/bin/env node

/**
 * Pair a headless Jarvis installation with the sole production To-Do owner.
 *
 * The plaintext credential is generated locally, never printed, and written
 * only to Jarvis's gitignored .env.local. Convex receives only its SHA-256
 * digest through an internal (deployment-admin-only) mutation.
 */

import { createHash, randomBytes } from 'node:crypto';
import { chmod, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function option(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const deployment = option('deployment', 'judicious-firefly-107');
const jarvisDir = resolve(option('jarvis-dir', '../jarvis'));
const explicitUserId = option('user-id', '');
const apiUrl = `https://${deployment}.convex.site/api/jarvis/todos`;

function convexRun(args) {
  const result = spawnSync('npx', ['convex', 'run', '--deployment', deployment, ...args], {
    cwd: resolve(dirname(new URL(import.meta.url).pathname), '..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || 'Convex command failed').trim();
    throw new Error(message);
  }
  return result.stdout.trim();
}

function parseJson(output, description) {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`Could not parse ${description} from Convex.`);
  }
}

async function replaceEnv(path, values) {
  let source = '';
  try {
    source = await readFile(path, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const pending = new Map(Object.entries(values));
  const lines = source.split(/\r?\n/).filter((line, index, all) =>
    line.length > 0 || index < all.length - 1
  );
  const updated = lines.map(line => {
    const match = /^([A-Z0-9_]+)=/.exec(line);
    if (!match || !pending.has(match[1])) return line;
    const value = pending.get(match[1]);
    pending.delete(match[1]);
    return `${match[1]}=${value}`;
  });
  if (updated.length && updated.at(-1) !== '') updated.push('');
  for (const [key, value] of pending) updated.push(`${key}=${value}`);

  const temporary = `${path}.pairing-${process.pid}`;
  await writeFile(temporary, `${updated.join('\n').replace(/\n*$/, '')}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await chmod(temporary, 0o600);
  await rename(temporary, path);
  await chmod(path, 0o600);
}

const users = parseJson(
  convexRun([
    '--inline-query',
    'const users = await ctx.db.query("users").collect(); return users.map((user) => ({ id: user._id, email: user.email ?? null }));',
  ]),
  'owner list'
);

const owner = explicitUserId
  ? users.find(user => user.id === explicitUserId)
  : users.length === 1
    ? users[0]
    : null;

if (!owner) {
  if (users.length === 0) {
    throw new Error('No production owner exists yet. Sign in once on the phone, then rerun this command.');
  }
  throw new Error('More than one owner exists. Rerun with --user-id <id>.');
}

const token = `jtd_${randomBytes(32).toString('base64url')}`;
const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
convexRun([
  'jarvisTodoCredentials:issueForOwner',
  JSON.stringify({ userId: owner.id, tokenHash, label: 'Jarvis on headless Mac mini' }),
]);

await replaceEnv(resolve(jarvisDir, '.env.local'), {
  JARVIS_TODO_API_URL: apiUrl,
  JARVIS_TODO_API_TOKEN: token,
});

console.log(`Paired Jarvis with ${owner.email || owner.id}. The credential was not printed.`);
