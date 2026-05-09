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

const EXPECTED_JOURNEY_MODULES = [
  'todo',
  'quantum',
  'meditate',
  'money',
  'health',
  'travel',
  'tennis',
];

const EXPECTED_LEARN_MODULES = [
  'world-order',
  'coffee',
  'guitar',
  'poetry',
  'french',
  'food',
  'analytics',
  'curious',
  'exercise',
];

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
      if (
        !modalManager.includes(module.routeHref) &&
        !indexHtml.includes(`href="${module.routeHref}"`)
      ) {
        fail(
          `Learn module "${module.id}" route "${module.routeHref}" is not wired in modalManager.ts or index.html.`
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

async function validateModalControllerBoundaries() {
  // Modal controllers must not import infra/ai directly. Most also need a
  // domain service (UI -> domain -> infra). Exercise is intentionally
  // self-contained against a curated local pool, so it has no required
  // domain import — only the forbidden one is enforced.
  const checks = [
    {
      path: 'src/components/modals/analytics/controller.ts',
      forbidden: '../../../infra/ai',
      required: '../../../domains/content/service',
    },
    {
      path: 'src/components/modals/exercise/controller.ts',
      forbidden: '../../../infra/ai',
      required: null,
    },
  ];

  for (const check of checks) {
    if (!(await fileExists(check.path))) continue;
    const source = await readText(check.path);
    if (source.includes(check.forbidden)) {
      fail(
        `${check.path} must not import "${check.forbidden}". Use domain services instead.`
      );
    }
    if (check.required && !source.includes(check.required)) {
      fail(
        `${check.path} must import "${check.required}" to keep UI -> domain -> infra layering.`
      );
    }
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

async function main() {
  validateRegistryBasics();
  await validateLearnModuleWiring();
  await validateLayerBoundaries();
  await validateModalControllerBoundaries();
  await validateUnsafeAiHtmlInjection();
  await validateNoExperimentalImports();

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
