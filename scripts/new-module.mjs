#!/usr/bin/env node
/**
 * King module scaffolder.
 *
 * Usage:
 *   npm run new:module <id> -- --category journey|learn \
 *                              --surface page|modal|external \
 *                              [--renderer dom|react] \
 *                              [--permissions ai,cache,storage,timer] \
 *                              [--external-url https://...]
 *
 * Creates `src/modules/<id>/` with manifest, controller, view, data,
 * types, icon, styles, AGENT.md, and a controller test skeleton.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const ALLOWED_CATEGORIES = new Set(['journey', 'learn']);
const ALLOWED_SURFACES = new Set(['page', 'modal', 'external']);
const ALLOWED_RENDERERS = new Set(['dom', 'react']);
const ALLOWED_PERMISSIONS = new Set(['ai', 'storage', 'timer', 'cache']);

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const positional = [];
  const flags = Object.create(null);
  let i = 0;
  while (i < argv.length) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const name = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        flags[name] = true;
        i += 1;
      } else {
        flags[name] = next;
        i += 2;
      }
    } else {
      positional.push(token);
      i += 1;
    }
  }
  return { positional, flags };
}

function toPascalCase(id) {
  return id
    .split('-')
    .map(part => (part ? part[0].toUpperCase() + part.slice(1) : ''))
    .join('');
}

function validateId(id) {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    fail(`Module id "${id}" must be kebab-case (lowercase letters, digits, dashes; start with a letter).`);
  }
}

async function ensureDoesNotExist(targetDir) {
  try {
    await fs.access(targetDir);
    fail(`Directory already exists: ${path.relative(repoRoot, targetDir)}`);
  } catch (err) {
    if (err && err.code === 'ENOENT') return;
    throw err;
  }
}

function manifestContents({ id, displayName, category, surface, permissions, renderer, externalUrl }) {
  const body = {
    id,
    displayName,
    category,
    surface,
    icon: './icon.svg',
    version: '0.1.0',
    renderer,
  };
  if (permissions.length > 0) body.permissions = permissions;
  if (surface === 'external' && externalUrl) body.externalUrl = externalUrl;
  return JSON.stringify(body, null, 2) + '\n';
}

function controllerSkeleton({ id, displayName, renderer }) {
  const className = `${toPascalCase(id)}Module`;
  if (renderer === 'react') {
    return `/**
 * ${displayName} module controller.
 *
 * Mounts a React tree into the host container. The shell hands us the
 * container, the SDK, and a userId — we own everything inside it.
 */

import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import type { ModuleContext, ModuleController } from '../../sdk/types';
import { App } from './App';

let root: Root | null = null;

export const init: ModuleController['init'] = async (ctx: ModuleContext) => {
  root = createRoot(ctx.container);
  root.render(createElement(App, { ctx }));
};

export const destroy: ModuleController['destroy'] = () => {
  root?.unmount();
  root = null;
};

export const ${className}: ModuleController = { init, destroy };
export default ${className};
`;
  }
  return `/**
 * ${displayName} module controller.
 *
 * Owns mounting and teardown of the module's view inside the container
 * the shell hands us. Anything DOM-specific belongs inside view.ts.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';
import { renderView } from './view';

let teardown: (() => void) | null = null;

export const init: ModuleController['init'] = async (ctx: ModuleContext) => {
  teardown = renderView(ctx.container, ctx);
};

export const destroy: ModuleController['destroy'] = () => {
  teardown?.();
  teardown = null;
};

export const ${className}: ModuleController = { init, destroy };
export default ${className};
`;
}

function viewSkeleton({ displayName }) {
  return `/**
 * ${displayName} view — DOM rendering.
 */

import type { ModuleContext } from '../../sdk/types';

export function renderView(container: HTMLElement, _ctx: ModuleContext): () => void {
  const root = document.createElement('section');
  root.className = '${displayName.toLowerCase().replace(/\s+/g, '-')}-view';
  root.textContent = '${displayName} module — replace this with the real view.';
  container.appendChild(root);

  return () => {
    if (root.parentNode === container) container.removeChild(root);
  };
}
`;
}

function reactAppSkeleton({ displayName }) {
  return `/**
 * ${displayName} React entry. Receives the module context as a prop.
 */

import type { ModuleContext } from '../../sdk/types';

export function App({ ctx: _ctx }: { ctx: ModuleContext }) {
  return <section className="${displayName.toLowerCase().replace(/\s+/g, '-')}-view">${displayName} module — replace this with the real view.</section>;
}
`;
}

function dataSkeleton({ displayName }) {
  return `/**
 * ${displayName} data module. Put module-specific data, fixtures, and
 * pure helpers here. Keep the controller and view free of business logic.
 */

export const __${displayName.toUpperCase().replace(/\s+/g, '_')}_DATA_PLACEHOLDER = true;
`;
}

function typesSkeleton({ displayName }) {
  const symbol = toPascalCase(displayName.replace(/\s+/g, '-'));
  return `/**
 * ${displayName} module-specific types.
 */

export interface ${symbol}State {
  // Replace with the module's real state shape.
  ready: boolean;
}
`;
}

function iconSvgPlaceholder() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <rect x="4" y="4" width="16" height="16" rx="2"/>
  <path d="M8 12h8"/>
  <path d="M12 8v8"/>
</svg>
`;
}

function stylesSkeleton({ id }) {
  return `/* ${id} module styles — scoped to elements inside the module view. */
`;
}

function agentTemplate({ id, displayName, category, surface, permissions, renderer }) {
  const permsLine = permissions.length > 0 ? permissions.join(', ') : 'none';
  return `# ${displayName} module

- **id:** \`${id}\`
- **category:** ${category}
- **surface:** ${surface}
- **renderer:** ${renderer}
- **permissions:** ${permsLine}

## Purpose

Describe what this module does and what makes it interesting.

## Files

- \`manifest.json\` — module metadata (don't hand-edit the id).
- \`controller.ts\` — implements \`ModuleController\` (init/destroy).
- \`view.ts\` — DOM rendering. Replace with \`App.tsx\` if renderer is \`react\`.
- \`data.ts\` — module-specific data and pure helpers.
- \`types.ts\` — module-specific TypeScript types.
- \`icon.svg\` — monoline 24x24 stroke icon (currentColor).
- \`styles.css\` — scoped styles.
- \`__tests__/\` — at least one test required by the architecture guard.

## Guardrails

- Only import from \`../../sdk/\`, \`../../core/\`, this folder, and \`node_modules\`.
- Never import from \`infra/\`, \`app/\`, \`components/\`, or other modules.
- The vintage typewriter aesthetic is locked — see \`CLAUDE.md\`.
`;
}

function testSkeleton({ id, displayName }) {
  const className = `${toPascalCase(id)}Module`;
  return `import { describe, expect, it } from 'vitest';
import { ${className}, init, destroy } from '../controller';

describe('${displayName} module controller', () => {
  it('exposes init and destroy', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(${className}.init).toBe(init);
    expect(${className}.destroy).toBe(destroy);
  });
});
`;
}

async function writeFile(targetDir, relativePath, contents) {
  const fullPath = path.join(targetDir, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, contents, 'utf8');
}

async function main() {
  const argv = process.argv.slice(2);
  const { positional, flags } = parseArgs(argv);

  const id = positional[0];
  if (!id) {
    fail('Missing module id. Usage: npm run new:module <id> -- --category <c> --surface <s>');
  }
  validateId(id);

  const category = String(flags.category ?? '');
  if (!ALLOWED_CATEGORIES.has(category)) {
    fail(`--category must be one of: ${[...ALLOWED_CATEGORIES].join(', ')}`);
  }

  const surface = String(flags.surface ?? '');
  if (!ALLOWED_SURFACES.has(surface)) {
    fail(`--surface must be one of: ${[...ALLOWED_SURFACES].join(', ')}`);
  }

  const renderer = String(flags.renderer ?? 'dom');
  if (!ALLOWED_RENDERERS.has(renderer)) {
    fail(`--renderer must be one of: ${[...ALLOWED_RENDERERS].join(', ')}`);
  }

  const permissions = String(flags.permissions ?? '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
  for (const p of permissions) {
    if (!ALLOWED_PERMISSIONS.has(p)) {
      fail(`Unknown permission "${p}". Allowed: ${[...ALLOWED_PERMISSIONS].join(', ')}`);
    }
  }

  const externalUrl = flags['external-url'] ? String(flags['external-url']) : undefined;
  if (surface === 'external' && !externalUrl) {
    fail('--external-url is required when --surface external is set.');
  }

  const displayName = flags['display-name']
    ? String(flags['display-name'])
    : id
        .split('-')
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');

  const targetDir = path.join(repoRoot, 'src', 'modules', id);
  await ensureDoesNotExist(targetDir);

  await writeFile(
    targetDir,
    'manifest.json',
    manifestContents({ id, displayName, category, surface, permissions, renderer, externalUrl })
  );
  await writeFile(targetDir, 'controller.ts', controllerSkeleton({ id, displayName, renderer }));
  if (renderer === 'react') {
    await writeFile(targetDir, 'App.tsx', reactAppSkeleton({ displayName }));
  } else {
    await writeFile(targetDir, 'view.ts', viewSkeleton({ displayName }));
  }
  await writeFile(targetDir, 'data.ts', dataSkeleton({ displayName }));
  await writeFile(targetDir, 'types.ts', typesSkeleton({ displayName }));
  await writeFile(targetDir, 'icon.svg', iconSvgPlaceholder());
  await writeFile(targetDir, 'styles.css', stylesSkeleton({ id }));
  await writeFile(targetDir, 'AGENT.md', agentTemplate({ id, displayName, category, surface, permissions, renderer }));
  await writeFile(
    targetDir,
    path.join('__tests__', 'controller.test.ts'),
    testSkeleton({ id, displayName })
  );

  const relTarget = path.relative(repoRoot, targetDir);
  console.log(`Scaffolded ${displayName} module at ${relTarget}/`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Replace the placeholder view/data/types with the real module.`);
  console.log(`  2. Update ${relTarget}/icon.svg with a monoline 24x24 SVG.`);
  console.log(`  3. Add real tests under ${relTarget}/__tests__/.`);
  console.log(`  4. Run \`npm run verify\` to validate.`);
}

await main();
