#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULE_REGISTRY_DATA } from '../src/domains/modules/registry.data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = process.env.ARCH_CHECK_ROOT
  ? path.resolve(process.env.ARCH_CHECK_ROOT)
  : path.resolve(__dirname, '..');

const EXPECTED_JOURNEY_MODULES = ['todo', 'being', 'tennis', 'khyaali-bhoot'];

const EXPECTED_LEARN_MODULES = ['food'];

const errors = [];

function fail(message) {
  errors.push(message);
}

async function readText(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  return fs.readFile(fullPath, 'utf8');
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

function sorted(values) {
  return [...values].sort();
}

function assertExactSet(name, actualValues, expectedValues) {
  const actual = sorted(actualValues).join(',');
  const expected = sorted(expectedValues).join(',');
  if (actual !== expected) {
    fail(`${name} mismatch. expected=[${expected}] actual=[${actual}]`);
  }
}

function extractElementAttributesById(htmlText, id) {
  const pattern = new RegExp(`<[^>]*\\sid="${id}"[^>]*>`, 'm');
  return htmlText.match(pattern)?.[0] ?? null;
}

function isForbiddenLayerImport(specifier) {
  return /(^|\/)(components|app)(\/|$)/.test(specifier);
}

const ALLOWED_PERMISSIONS = new Set(['storage', 'timer']);
const ALLOWED_CATEGORIES = new Set(['journey', 'learn']);
const ALLOWED_SURFACES = new Set(['page', 'modal', 'external']);
const ALLOWED_RENDERERS = new Set(['dom']);
const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

async function listSubdirectories(relativeDir) {
  const startPath = path.join(repoRoot, relativeDir);
  if (!(await fileExists(relativeDir))) return [];
  const entries = await fs.readdir(startPath, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}

async function collectCodeFiles(relativeDir) {
  const startPath = path.join(repoRoot, relativeDir);
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

  await walk(startPath);
  return files;
}

function validateRegistryBasics() {
  const requiredFields = [
    'id',
    'displayName',
    'category',
    'surface',
    'entrySelector',
    'handlerName',
    'ownerPath',
  ];
  const validCategories = new Set(['journey', 'learn']);
  const validSurfaces = new Set(['page', 'modal']);

  const seenIds = new Set();
  for (const module of MODULE_REGISTRY_DATA) {
    for (const field of requiredFields) {
      const value = module[field];
      if (typeof value !== 'string' || value.trim().length === 0) {
        fail(`Registry entry "${module.id}" is missing required field "${field}".`);
      }
    }

    if (!validCategories.has(module.category)) {
      fail(`Registry entry "${module.id}" has invalid category "${module.category}".`);
    }

    if (!validSurfaces.has(module.surface)) {
      fail(`Registry entry "${module.id}" has invalid surface "${module.surface}".`);
    }

    if (seenIds.has(module.id)) {
      fail(`Duplicate module id "${module.id}" found in registry.`);
    }
    seenIds.add(module.id);
  }

  const journeyIds = MODULE_REGISTRY_DATA.filter(
    module => module.category === 'journey'
  ).map(module => module.id);

  const learnIds = MODULE_REGISTRY_DATA.filter(
    module => module.category === 'learn'
  ).map(module => module.id);

  assertExactSet('Journey module IDs', journeyIds, EXPECTED_JOURNEY_MODULES);
  assertExactSet('Learn module IDs', learnIds, EXPECTED_LEARN_MODULES);
}

async function validateLearnModuleWiring() {
  const indexHtml = await readText('index.html');
  const modalManager = await readText('src/components/modals/modalManager.ts');
  const modalFactory = await readText('src/components/modals/factory.ts');

  for (const module of MODULE_REGISTRY_DATA) {
    const ownerExists = await fileExists(module.ownerPath);
    if (!ownerExists) {
      fail(`Owner path is missing for "${module.id}": ${module.ownerPath}`);
    }

    if (module.category !== 'learn') continue;

    if (!module.entrySelector.startsWith('#')) {
      fail(`Learn module "${module.id}" must use an id selector entrySelector.`);
      continue;
    }

    const entryId = module.entrySelector.slice(1);
    const elementAttributes = extractElementAttributesById(indexHtml, entryId);
    if (!elementAttributes) {
      fail(`Learn module "${module.id}" is missing card selector "${module.entrySelector}" in index.html.`);
      continue;
    }

    if (module.dataModule) {
      const expectedDataModule = `data-module="${module.dataModule}"`;
      if (!elementAttributes.includes(expectedDataModule)) {
        fail(
          `Learn module "${module.id}" has non-canonical data-module on #${entryId}. expected ${expectedDataModule}.`
        );
      }
    }

    if (!modalManager.includes(module.handlerName)) {
      fail(
        `Learn module "${module.id}" handler "${module.handlerName}" is not mapped in modalManager.ts.`
      );
    }

    if (module.surface === 'modal') {
      if (!module.modalId) {
        fail(`Learn module "${module.id}" is modal-surface but missing modalId.`);
        continue;
      }

      if (!indexHtml.includes(`id="${module.modalId}"`)) {
        fail(`Learn module "${module.id}" modal "${module.modalId}" is missing in index.html.`);
      }

      const modalIdSingle = `modalId: '${module.modalId}'`;
      const modalIdDouble = `modalId: "${module.modalId}"`;
      if (!modalFactory.includes(modalIdSingle) && !modalFactory.includes(modalIdDouble)) {
        fail(
          `Learn module "${module.id}" modalId "${module.modalId}" is not declared in MODAL_CONFIGS.`
        );
      }
    }

    if (module.surface === 'page') {
      if (!module.routeHref) {
        fail(`Learn module "${module.id}" is page-surface but missing routeHref.`);
        continue;
      }
      // Phase 2: the route can now live inside the module's controller
      // as well — that's where navigation is owned in the v2 architecture.
      let ownerSource = '';
      if (await fileExists(module.ownerPath)) {
        ownerSource = await readText(module.ownerPath);
      }
      const wiredInModalManager = modalManager.includes(module.routeHref);
      const wiredInIndex = indexHtml.includes(`href="${module.routeHref}"`);
      const wiredInOwner = ownerSource.includes(module.routeHref);
      if (!wiredInModalManager && !wiredInIndex && !wiredInOwner) {
        fail(
          `Learn module "${module.id}" route "${module.routeHref}" is not wired in modalManager.ts, index.html, or the module's ownerPath.`
        );
      }
    }
  }
}

async function validateLayerBoundaries() {
  const files = [
    ...(await collectCodeFiles('src/domains')),
    ...(await collectCodeFiles('src/infra')),
  ];
  const fromImportRegex = /from\s+['"]([^'"]+)['"]/g;
  const sideEffectImportRegex = /^\s*import\s+['"]([^'"]+)['"]/;

  for (const relativeFile of files) {
    const source = await readText(relativeFile);
    const lines = source.split('\n');
    lines.forEach((line, lineIndex) => {
      const specifiers = [];

      for (const match of line.matchAll(fromImportRegex)) {
        specifiers.push(match[1]);
      }

      const sideEffectMatch = sideEffectImportRegex.exec(line);
      if (sideEffectMatch) {
        specifiers.push(sideEffectMatch[1]);
      }

      specifiers.forEach(specifier => {
        if (isForbiddenLayerImport(specifier)) {
          fail(
            `Forbidden import in ${relativeFile}:${lineIndex + 1} -> "${specifier}" (domains/infra cannot import app/components).`
          );
        }
      });
    });
  }
}

async function validateUnsafeAiHtmlInjection() {
  const files = [
    ...(await collectCodeFiles('src/app')),
    ...(await collectCodeFiles('src/components')),
    ...(await collectCodeFiles('src/pages')),
    ...(await collectCodeFiles('src/apps')),
  ];

  const dangerousPatterns = [
    {
      regex: /innerHTML\s*=\s*.*response\.text/,
      label: 'innerHTML with response.text',
    },
    {
      regex: /setModalContent\([^)]*response\.text/,
      label: 'setModalContent with response.text',
    },
  ];

  for (const relativeFile of files) {
    const source = await readText(relativeFile);
    const lines = source.split('\n');
    lines.forEach((line, lineIndex) => {
      dangerousPatterns.forEach(pattern => {
        if (pattern.regex.test(line)) {
          fail(
            `Unsafe AI HTML injection in ${relativeFile}:${lineIndex + 1} -> ${pattern.label}. Escape content before rendering.`
          );
        }
      });
    });
  }
}

async function validateNoExperimentalImports() {
  const files = await collectCodeFiles('src');
  const fromImportRegex = /from\s+['"]([^'"]+)['"]/g;
  const sideEffectImportRegex = /^\s*import\s+['"]([^'"]+)['"]/;

  for (const relativeFile of files) {
    const source = await readText(relativeFile);
    const lines = source.split('\n');
    lines.forEach((line, lineIndex) => {
      const specifiers = [];

      for (const match of line.matchAll(fromImportRegex)) {
        specifiers.push(match[1]);
      }

      const sideEffectMatch = sideEffectImportRegex.exec(line);
      if (sideEffectMatch) {
        specifiers.push(sideEffectMatch[1]);
      }

      specifiers.forEach(specifier => {
        if (specifier.includes('archive/experimental-src')) {
          fail(
            `Forbidden experimental import in ${relativeFile}:${lineIndex + 1} -> "${specifier}".`
          );
        }
      });
    });
  }
}

async function validateManifestModules() {
  const moduleDirs = await listSubdirectories('src/modules');
  if (moduleDirs.length === 0) return [];

  const manifests = [];
  const seenIds = new Set();

  for (const dirName of moduleDirs) {
    const baseRel = path.join('src/modules', dirName);
    const manifestRel = path.join(baseRel, 'manifest.json');
    const controllerRel = path.join(baseRel, 'controller.ts');
    const iconRel = path.join(baseRel, 'icon.svg');
    const agentRel = path.join(baseRel, 'AGENT.md');
    const testsRel = path.join(baseRel, '__tests__');

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
      fail(
        `Module "${dirName}" manifest.id "${manifest.id}" does not match its folder name.`
      );
    }

    if (seenIds.has(manifest.id)) {
      fail(`Duplicate module id "${manifest.id}" in src/modules/.`);
    }
    seenIds.add(manifest.id);

    if (typeof manifest.displayName !== 'string' || manifest.displayName.trim() === '') {
      fail(`Module "${dirName}" manifest is missing displayName.`);
    }
    if (!ALLOWED_CATEGORIES.has(manifest.category)) {
      fail(`Module "${dirName}" manifest has invalid category "${manifest.category}".`);
    }
    if (!ALLOWED_SURFACES.has(manifest.surface)) {
      fail(`Module "${dirName}" manifest has invalid surface "${manifest.surface}".`);
    }
    if (manifest.renderer !== undefined && !ALLOWED_RENDERERS.has(manifest.renderer)) {
      fail(`Module "${dirName}" manifest has invalid renderer "${manifest.renderer}".`);
    }
    if (typeof manifest.icon !== 'string' || !manifest.icon.endsWith('.svg')) {
      fail(`Module "${dirName}" manifest.icon must be a relative .svg path.`);
    }
    if (typeof manifest.version !== 'string' || !SEMVER_REGEX.test(manifest.version)) {
      fail(`Module "${dirName}" manifest.version must be valid semver (was "${manifest.version}").`);
    }
    if (manifest.surface === 'external' && (typeof manifest.externalUrl !== 'string' || manifest.externalUrl.trim() === '')) {
      fail(`Module "${dirName}" has surface=external but no externalUrl.`);
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
    if (manifest.dependencies !== undefined) {
      if (!Array.isArray(manifest.dependencies)) {
        fail(`Module "${dirName}" manifest.dependencies must be an array of module ids.`);
      } else {
        for (const dep of manifest.dependencies) {
          if (typeof dep !== 'string' || dep.trim() === '') {
            fail(`Module "${dirName}" has an invalid dependency entry "${dep}".`);
          }
        }
      }
    }

    if (!(await fileExists(controllerRel))) {
      fail(`Module "${dirName}" is missing controller.ts.`);
    } else {
      const controllerSrc = await readText(controllerRel);
      // Accept either named exports (export const init / export function init)
      // or a default export bundling init/destroy.
      const exportsInit = /export\s+(?:const|function|async\s+function|let)\s+init\b/.test(controllerSrc)
        || /\binit\b\s*:/.test(controllerSrc);
      const exportsDestroy = /export\s+(?:const|function|let)\s+destroy\b/.test(controllerSrc)
        || /\bdestroy\b\s*:/.test(controllerSrc);
      if (!exportsInit) {
        fail(`Module "${dirName}" controller.ts must export an "init" function.`);
      }
      if (!exportsDestroy) {
        fail(`Module "${dirName}" controller.ts must export a "destroy" function.`);
      }
    }

    if (!(await fileExists(iconRel))) {
      fail(`Module "${dirName}" is missing icon.svg.`);
    }
    if (!(await fileExists(agentRel))) {
      fail(`Module "${dirName}" is missing AGENT.md.`);
    }
    if (!(await fileExists(testsRel))) {
      fail(`Module "${dirName}" is missing __tests__/ directory.`);
    } else {
      const testFiles = await collectCodeFiles(testsRel);
      const hasTest = testFiles.some(file => /\.test\.(t|j)sx?$/.test(file));
      if (!hasTest) {
        fail(`Module "${dirName}" __tests__/ has no *.test.ts file.`);
      }
    }

    manifests.push({ ...manifest, dirName });
  }

  return manifests;
}

async function validateModuleImportBoundaries() {
  const moduleDirs = await listSubdirectories('src/modules');
  if (moduleDirs.length === 0) return;

  const fromImportRegex = /from\s+['"]([^'"]+)['"]/g;
  const sideEffectImportRegex = /^\s*import\s+['"]([^'"]+)['"]/;

  for (const dirName of moduleDirs) {
    const baseRel = path.join('src/modules', dirName);
    const files = await collectCodeFiles(baseRel);

    for (const relativeFile of files) {
      const source = await readText(relativeFile);
      const lines = source.split('\n');

      lines.forEach((line, lineIndex) => {
        const specifiers = [];
        for (const match of line.matchAll(fromImportRegex)) {
          specifiers.push(match[1]);
        }
        const sideEffectMatch = sideEffectImportRegex.exec(line);
        if (sideEffectMatch) specifiers.push(sideEffectMatch[1]);

        for (const specifier of specifiers) {
          // Bare module specifiers (node_modules) and relative imports.
          if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
            // node_modules — fine.
            continue;
          }
          // Resolve relative to the file's directory.
          const fileDir = path.dirname(path.join(repoRoot, relativeFile));
          const resolved = path.resolve(fileDir, specifier);
          const relativeFromRoot = path.relative(repoRoot, resolved);

          // Allow imports that stay within the module's own folder.
          if (relativeFromRoot.startsWith(baseRel + path.sep) || relativeFromRoot === baseRel) {
            continue;
          }
          // Allow imports from sdk/, core/, utils/, lib/, types/, infra/,
          // and domains/. infra/ and domains/ stay reachable so modules can
          // continue calling AI providers and domain services directly while
          // the SDK adapters fill in over Phase 3. Modules can never reach
          // into app/, components/, pages/, apps/, or other modules — those
          // are higher-level UI organisation.
          const allowedPrefixes = [
            'src/sdk',
            'src/core',
            'src/utils',
            'src/lib',
            'src/types',
            'src/infra',
            'src/domains',
          ];
          const isAllowed = allowedPrefixes.some(
            prefix => relativeFromRoot === prefix || relativeFromRoot.startsWith(prefix + path.sep)
          );
          if (isAllowed) continue;

          fail(
            `Module import boundary violated in ${relativeFile}:${lineIndex + 1} -> "${specifier}". ` +
              `Modules can only import from sdk/, core/, utils/, lib/, types/, infra/, domains/, their own folder, or node_modules.`
          );
        }
      });
    }
  }
}

async function main() {
  validateRegistryBasics();
  await validateLearnModuleWiring();
  await validateLayerBoundaries();
  await validateUnsafeAiHtmlInjection();
  await validateNoExperimentalImports();
  await validateManifestModules();
  await validateModuleImportBoundaries();

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
