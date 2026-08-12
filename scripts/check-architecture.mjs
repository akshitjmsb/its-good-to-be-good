#!/usr/bin/env node

/**
 * Architecture guard — enforces the orbit contract.
 *
 * The manifest IS the registry: every folder under `src/modules/` carries a
 * manifest.json whose `ring` encodes the home's geometry.
 *
 *   • circle — a soul practice. Acts in place on the home, never navigates.
 *     No routeHref, no page, no entry.
 *   • square — a purpose tool. Has its own page (routeHref) mounted by the
 *     module's entry.ts and linked from a corner tile on the home.
 *
 * Layering: modules sit on sdk/platform/utils; platform and sdk never
 * reach up into home/ or modules/.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = process.env.ARCH_CHECK_ROOT
  ? path.resolve(process.env.ARCH_CHECK_ROOT)
  : path.resolve(__dirname, '..');

// The exact module set. Adding a module means updating this map on purpose.
const EXPECTED_MODULES = {
  being: 'circle',
  food: 'circle',
  todo: 'square',
  'khyaali-bhoot': 'square',
  tennis: 'square',
};

// The five Sukoon pillars and three zero-barrier Mindfulness actions act in
// place on the home; these markup hooks are their registration.
const EXPECTED_SOUL_HOOKS = [
  'data-panel="sleep"',
  'data-panel="food"',
  'data-panel="movement"',
  'data-panel="mindfulness"',
  'data-panel="rooh"',
  'data-mode="breathe"',
  'data-mode="om"',
  'data-mode="focus"',
];

const ALLOWED_RINGS = new Set(['circle', 'square']);
const ALLOWED_RENDERERS = new Set(['dom']);
const ALLOWED_PERMISSIONS = new Set(['storage', 'timer']);
const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const errors = [];

function fail(message) {
  errors.push(message);
}

async function readText(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function listSubdirectories(relativeDir) {
  if (!(await fileExists(relativeDir))) return [];
  const entries = await fs.readdir(path.join(repoRoot, relativeDir), {
    withFileTypes: true,
  });
  return entries.filter(e => e.isDirectory()).map(e => e.name);
}

async function collectCodeFiles(relativeDir) {
  if (!(await fileExists(relativeDir))) return [];
  const files = [];
  async function walk(dirPath) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const childPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await walk(childPath);
        continue;
      }
      if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        files.push(path.relative(repoRoot, childPath));
      }
    }
  }
  await walk(path.join(repoRoot, relativeDir));
  return files;
}

function collectImportSpecifiers(line) {
  const specifiers = [];
  for (const match of line.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    specifiers.push(match[1]);
  }
  const sideEffect = /^\s*import\s+['"]([^'"]+)['"]/.exec(line);
  if (sideEffect) specifiers.push(sideEffect[1]);
  return specifiers;
}

/* ── Manifest + ring contract ─────────────────────────────────────────── */

async function validateModules() {
  const moduleDirs = await listSubdirectories('src/modules');

  const expectedIds = Object.keys(EXPECTED_MODULES).sort().join(',');
  const actualIds = [...moduleDirs].sort().join(',');
  if (expectedIds !== actualIds) {
    fail(`Module set mismatch. expected=[${expectedIds}] actual=[${actualIds}]`);
  }

  let indexHtml = '';
  try {
    indexHtml = await readText('index.html');
  } catch {
    fail('index.html is missing.');
  }

  for (const dirName of moduleDirs) {
    const baseDir = `src/modules/${dirName}`;
    const manifestRel = `${baseDir}/manifest.json`;

    if (!(await fileExists(manifestRel))) {
      fail(`Module "${dirName}" is missing manifest.json.`);
      continue;
    }

    let manifest;
    try {
      manifest = JSON.parse(await readText(manifestRel));
    } catch (err) {
      fail(`Module "${dirName}" manifest.json is not valid JSON: ${err.message}`);
      continue;
    }

    if (manifest.id !== dirName) {
      fail(`Module "${dirName}" manifest.id "${manifest.id}" does not match its folder name.`);
    }
    if (typeof manifest.displayName !== 'string' || manifest.displayName.trim() === '') {
      fail(`Module "${dirName}" manifest is missing displayName.`);
    }
    if (!ALLOWED_RINGS.has(manifest.ring)) {
      fail(`Module "${dirName}" manifest has invalid ring "${manifest.ring}".`);
    }
    if (EXPECTED_MODULES[dirName] && manifest.ring !== EXPECTED_MODULES[dirName]) {
      fail(
        `Module "${dirName}" ring "${manifest.ring}" does not match the expected "${EXPECTED_MODULES[dirName]}".`
      );
    }
    if (typeof manifest.icon !== 'string' || !manifest.icon.endsWith('.svg')) {
      fail(`Module "${dirName}" manifest.icon must be a relative .svg path.`);
    }
    if (typeof manifest.version !== 'string' || !SEMVER_REGEX.test(manifest.version)) {
      fail(`Module "${dirName}" manifest.version must be valid semver (was "${manifest.version}").`);
    }
    if (manifest.renderer !== undefined && !ALLOWED_RENDERERS.has(manifest.renderer)) {
      fail(`Module "${dirName}" manifest has invalid renderer "${manifest.renderer}".`);
    }
    if (manifest.permissions !== undefined) {
      if (!Array.isArray(manifest.permissions)) {
        fail(`Module "${dirName}" manifest.permissions must be an array.`);
      } else {
        for (const perm of manifest.permissions) {
          if (!ALLOWED_PERMISSIONS.has(perm)) {
            fail(`Module "${dirName}" has unknown permission "${perm}".`);
          }
        }
      }
    }

    // The ring contract.
    if (manifest.ring === 'circle') {
      if (manifest.routeHref !== undefined) {
        fail(
          `Circle module "${dirName}" must not have a routeHref — circle practices act in place and never navigate.`
        );
      }
    }

    if (manifest.ring === 'square') {
      if (typeof manifest.routeHref !== 'string' || !manifest.routeHref.endsWith('.html')) {
        fail(`Square module "${dirName}" must have an .html routeHref — square tools always navigate.`);
      } else {
        if (!(await fileExists(manifest.routeHref))) {
          fail(`Square module "${dirName}" page "${manifest.routeHref}" does not exist.`);
        }
        if (!indexHtml.includes(`href="${manifest.routeHref}"`)) {
          fail(
            `Square module "${dirName}" is not linked from the home orbit (missing href="${manifest.routeHref}" in index.html).`
          );
        }
        if (!(await fileExists(`${baseDir}/entry.ts`))) {
          fail(`Square module "${dirName}" is missing entry.ts (the page's script entry).`);
        } else if (await fileExists(manifest.routeHref)) {
          const pageHtml = await readText(manifest.routeHref);
          if (!pageHtml.includes(`${baseDir}/entry.ts`)) {
            fail(
              `Page "${manifest.routeHref}" does not load ${baseDir}/entry.ts.`
            );
          }
        }
      }
    }

    // Folder contract: icon + AGENT.md always; tests whenever the module has
    // logic beyond its entry file.
    if (!(await fileExists(`${baseDir}/icon.svg`))) {
      fail(`Module "${dirName}" is missing icon.svg.`);
    }
    if (!(await fileExists(`${baseDir}/AGENT.md`))) {
      fail(`Module "${dirName}" is missing AGENT.md.`);
    }

    const codeFiles = await collectCodeFiles(baseDir);
    const logicFiles = codeFiles.filter(
      file =>
        !file.endsWith(`${path.sep}entry.ts`) &&
        !file.includes(`${path.sep}__tests__${path.sep}`)
    );
    if (logicFiles.length > 0) {
      const testFiles = codeFiles.filter(file => /\.test\.tsx?$/.test(file));
      if (testFiles.length === 0) {
        fail(`Module "${dirName}" has logic files but no tests in __tests__/.`);
      }
    }
  }

  for (const hook of EXPECTED_SOUL_HOOKS) {
    if (indexHtml && !indexHtml.includes(hook)) {
      fail(`Soul practice hook ${hook} is missing from the home orbit.`);
    }
  }
}

/* ── Layering ─────────────────────────────────────────────────────────── */

// platform/, sdk/, and utils/ are the foundation — they must never reach up
// into home/ or modules/.
async function validateFoundationBoundaries() {
  const files = [
    ...(await collectCodeFiles('src/platform')),
    ...(await collectCodeFiles('src/sdk')),
    ...(await collectCodeFiles('src/utils')),
  ];

  for (const relativeFile of files) {
    const source = await readText(relativeFile);
    source.split('\n').forEach((line, lineIndex) => {
      for (const specifier of collectImportSpecifiers(line)) {
        if (!specifier.startsWith('.')) continue;
        const resolved = path.relative(
          repoRoot,
          path.resolve(path.dirname(path.join(repoRoot, relativeFile)), specifier)
        );
        if (resolved.startsWith('src/home') || resolved.startsWith('src/modules')) {
          fail(
            `Forbidden import in ${relativeFile}:${lineIndex + 1} -> "${specifier}" (platform/sdk/utils cannot import home/ or modules/).`
          );
        }
      }
    });
  }
}

// Modules import only their own folder + the foundation. Never home/, never
// each other.
async function validateModuleImportBoundaries() {
  const moduleDirs = await listSubdirectories('src/modules');

  for (const dirName of moduleDirs) {
    const baseDir = `src/modules/${dirName}`;
    const files = await collectCodeFiles(baseDir);

    for (const relativeFile of files) {
      const source = await readText(relativeFile);
      source.split('\n').forEach((line, lineIndex) => {
        for (const specifier of collectImportSpecifiers(line)) {
          if (!specifier.startsWith('.') && !specifier.startsWith('/')) continue;

          const fileDir = path.dirname(path.join(repoRoot, relativeFile));
          const resolved = path.relative(repoRoot, path.resolve(fileDir, specifier));

          if (resolved.startsWith(baseDir + path.sep) || resolved === baseDir) {
            continue;
          }

          const allowedPrefixes = ['src/sdk', 'src/platform', 'src/utils', 'src/types'];
          const isAllowed = allowedPrefixes.some(
            prefix => resolved === prefix || resolved.startsWith(prefix + path.sep) || resolved === `${prefix}.ts`
          );
          if (isAllowed) continue;

          fail(
            `Module import boundary violated in ${relativeFile}:${lineIndex + 1} -> "${specifier}". ` +
              `Modules can only import from sdk/, platform/, utils/, types, their own folder, or node_modules.`
          );
        }
      });
    }
  }
}

/* ── Unsafe HTML injection ────────────────────────────────────────────── */

async function validateUnsafeHtmlInjection() {
  const files = [
    ...(await collectCodeFiles('src/home')),
    ...(await collectCodeFiles('src/modules')),
  ];

  const dangerousPatterns = [
    {
      regex: /innerHTML\s*=\s*.*response\.text/,
      label: 'innerHTML with response.text',
    },
  ];

  for (const relativeFile of files) {
    const source = await readText(relativeFile);
    source.split('\n').forEach((line, lineIndex) => {
      dangerousPatterns.forEach(pattern => {
        if (pattern.regex.test(line)) {
          fail(
            `Unsafe HTML injection in ${relativeFile}:${lineIndex + 1} -> ${pattern.label}. Escape content before rendering.`
          );
        }
      });
    });
  }
}

/* ── Main ─────────────────────────────────────────────────────────────── */

async function main() {
  await validateModules();
  await validateFoundationBoundaries();
  await validateModuleImportBoundaries();
  await validateUnsafeHtmlInjection();

  if (errors.length > 0) {
    console.error('Architecture guard check failed:\n');
    errors.forEach((message, index) => {
      console.error(`${index + 1}. ${message}`);
    });
    process.exit(1);
  }

  console.log('Architecture guard check passed.');
}

await main();
