import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY } from '../registry';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts/check-architecture.mjs');

function writeFixtureFile(root: string, relativePath: string, content: string) {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
}

function entryIdFromSelector(selector: string): string {
  if (!selector.startsWith('#')) {
    throw new Error(`Only id selectors are supported in this fixture: ${selector}`);
  }
  return selector.slice(1);
}

function createFixture(root: string) {
  const learnModules = MODULE_REGISTRY.filter(module => module.category === 'learn');
  const modalLearnModules = learnModules.filter(module => module.surface === 'modal');

  const cardHtml = learnModules
    .map(module => {
      const id = entryIdFromSelector(module.entrySelector);
      const dataModule = module.dataModule ?? module.id;
      return `<button id="${id}" data-module="${dataModule}">${module.displayName}</button>`;
    })
    .join('\n');

  const modalHtml = modalLearnModules
    .map(module => `<div id="${module.modalId}"></div>`)
    .join('\n');

  writeFixtureFile(
    root,
    'index.html',
    `<html><body>${cardHtml}<a href="french.html"></a>${modalHtml}</body></html>`
  );

  const modalManagerContent = [
    'export function mapHandlers() {',
    ...learnModules.map(module => `  // ${module.handlerName}`),
    ...learnModules
      .filter(module => module.surface === 'page' && module.routeHref)
      .map(module => `  // route: ${module.routeHref}`),
    "  window.location.href = 'french.html';",
    '}',
  ].join('\n');
  writeFixtureFile(
    root,
    'src/components/modals/modalManager.ts',
    modalManagerContent
  );

  const factoryContent = [
    'export const MODAL_CONFIGS = {',
    ...modalLearnModules.map(module => `  ${module.id}: { modalId: '${module.modalId}' },`),
    '};',
  ].join('\n');
  writeFixtureFile(root, 'src/components/modals/factory.ts', factoryContent);

  MODULE_REGISTRY.forEach(module => {
    // Modules whose ownerPath is a shared file (already populated above with
    // real fixture content) must not be clobbered by the bare 'export {};'
    // stub below.
    if (module.ownerPath === 'src/components/modals/modalManager.ts') return;
    if (module.ownerPath === 'src/components/modals/factory.ts') return;

    if (module.ownerPath === 'src/modules/analytics/controller.ts') {
      // Analytics must keep going through the content service. The fixture
      // mirrors that — `validateModalControllerBoundaries` text-scans for
      // the required import.
      writeFixtureFile(
        root,
        module.ownerPath,
        "import { getAnalyticsContent } from '../../domains/content/service';\nexport function showAnalyticsModal() { return getAnalyticsContent; }\nexport function init(){}\nexport function destroy(){}\n"
      );
    } else if (module.surface === 'page' && module.routeHref) {
      // Page-surface controllers carry their routeHref so the wiring
      // check (now also looking at ownerPath) can find it.
      writeFixtureFile(
        root,
        module.ownerPath,
        `export const route = '${module.routeHref}';\nexport function init(){}\nexport function destroy(){}\n`
      );
    } else {
      writeFixtureFile(
        root,
        module.ownerPath,
        'export function init(){}\nexport function destroy(){}\n'
      );
    }

    // When the ownerPath lives inside src/modules/<id>/, the manifest
    // module check also needs the required sidecar files for that folder.
    const modulesMatch = module.ownerPath.match(/^src\/modules\/([^/]+)\//);
    if (modulesMatch) {
      const dirName = modulesMatch[1];
      const baseDir = `src/modules/${dirName}`;
      const manifest: Record<string, unknown> = {
        id: dirName,
        displayName: module.displayName,
        category: module.category,
        surface: module.surface,
        icon: './icon.svg',
        version: '0.1.0',
        renderer: 'dom',
      };
      writeFixtureFile(
        root,
        `${baseDir}/manifest.json`,
        JSON.stringify(manifest, null, 2) + '\n'
      );
      writeFixtureFile(root, `${baseDir}/icon.svg`, '<svg></svg>\n');
      writeFixtureFile(root, `${baseDir}/AGENT.md`, `# ${module.displayName}\n`);
      writeFixtureFile(
        root,
        `${baseDir}/__tests__/sentinel.test.ts`,
        "import { it } from 'vitest'; it('exists', () => {});\n"
      );
    }
  });

  writeFixtureFile(root, 'src/domains/safe.ts', 'export const safe = true;');
  writeFixtureFile(root, 'src/infra/safe.ts', 'export const safe = true;');
}

function runArchitectureCheck(root: string) {
  return spawnSync('node', [scriptPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ARCH_CHECK_ROOT: root,
    },
    encoding: 'utf8',
  });
}

describe('architecture check script', () => {
  it('passes for a valid fixture', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'arch-check-valid-'));
    try {
      createFixture(fixtureRoot);
      const result = runArchitectureCheck(fixtureRoot);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Architecture guard check passed.');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('fails when a forbidden import exists in domains', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'arch-check-import-fail-'));
    try {
      createFixture(fixtureRoot);
      writeFixtureFile(
        fixtureRoot,
        'src/domains/bad.ts',
        "import '../components/forbidden';\nexport const bad = true;\n"
      );

      const result = runArchitectureCheck(fixtureRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Forbidden import');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('fails when a learn module card selector is missing', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'arch-check-selector-fail-'));
    try {
      createFixture(fixtureRoot);

      // Remove one canonical learn card selector on purpose.
      writeFixtureFile(
        fixtureRoot,
        'index.html',
        '<html><body><button id="coffee-clickable" data-module="coffee">Coffee</button></body></html>'
      );

      const result = runArchitectureCheck(fixtureRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('world-order');
      expect(result.stderr).toContain('missing card selector');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
