#!/usr/bin/env node
/**
 * King module scaffolder — creates a new square (purpose) tool.
 *
 * Usage:
 *   npm run new:module <id> [-- --name "Display Name"]
 *
 * Creates `src/modules/<id>/` (manifest, entry.ts, icon.svg, AGENT.md) and
 * `<id>.html`, then prints the three manual wiring steps the architecture
 * guard will hold you to: EXPECTED_MODULES in scripts/check-architecture.mjs,
 * a corner/tile link on the home, and the Vite input.
 *
 * Circle (soul) practices are rare and hand-crafted — they live in the home
 * markup and `src/modules/being/`; this scaffolder doesn't generate them.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2).filter(a => a !== '--');
const id = args[0];
const nameFlagIndex = args.indexOf('--name');
const displayName =
  nameFlagIndex !== -1 && args[nameFlagIndex + 1]
    ? args[nameFlagIndex + 1]
    : id
        ?.split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

if (!id) fail('Usage: npm run new:module <id> [-- --name "Display Name"]');
if (!/^[a-z][a-z0-9-]*$/.test(id)) fail(`Module id must be kebab-case (was "${id}").`);

const baseDir = path.join(repoRoot, 'src/modules', id);
const pagePath = path.join(repoRoot, `${id}.html`);

try {
  await fs.access(baseDir);
  fail(`src/modules/${id}/ already exists.`);
} catch {
  /* good — does not exist */
}

const manifest = {
  id,
  displayName,
  ring: 'square',
  routeHref: `${id}.html`,
  icon: './icon.svg',
  version: '0.1.0',
  renderer: 'dom',
  permissions: ['storage'],
};

const entry = `/**
 * ${displayName} page entry.
 */

import './${id}.css';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('app-container');
  if (container) container.dataset.runtime = '${id}';
});
`;

const icon = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9" />
</svg>
`;

const agentMd = `# ${displayName} module

- **id:** \`${id}\`
- **ring:** square (purpose tool — opens its own page)
- **page:** \`${id}.html\`, mounted by \`entry.ts\`

## Purpose

TODO — one paragraph on what this tool records.
`;

const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${displayName} — It's Good to Be Good</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Special+Elite&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="src/styles/index.css">
    <link rel="stylesheet" href="src/styles/home-lock.css">
    <link rel="icon" href="/vitruvian-logo.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/manifest.json">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="It's Good to Be Good">
    <meta name="theme-color" content="#111111">
</head>
<body class="home-vintage-lock">
    <div id="app-container" class="app-container ${id}-page">
        <nav class="page-back-nav">
            <a href="index.html" class="home-link">← Home</a>
        </nav>

        <header class="text-center mb-6">
            <div class="flex justify-center items-center">
                <h1>${displayName}</h1>
            </div>
        </header>
    </div>

    <script type="module" src="src/modules/${id}/entry.ts"></script>
</body>
</html>
`;

await fs.mkdir(baseDir, { recursive: true });
await fs.writeFile(path.join(baseDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(path.join(baseDir, 'entry.ts'), entry);
await fs.writeFile(path.join(baseDir, `${id}.css`), `/* ${displayName} page styles */\n`);
await fs.writeFile(path.join(baseDir, 'icon.svg'), icon);
await fs.writeFile(path.join(baseDir, 'AGENT.md'), agentMd);
await fs.writeFile(pagePath, pageHtml);

console.log(`Created src/modules/${id}/ and ${id}.html.

Wire it up (the architecture guard enforces all three):
  1. Add '${id}': 'square' to EXPECTED_MODULES in scripts/check-architecture.mjs
  2. Add a tile on the home: <a class="orbit-tool" href="${id}.html" ...> in index.html
  3. Register the Vite input in vite.config.ts: ${id}: path.resolve(__dirname, '${id}.html')

Then: npm run check:architecture`);
