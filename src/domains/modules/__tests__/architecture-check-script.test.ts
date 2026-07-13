import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODULE_REGISTRY } from '../registry';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts/check-architecture.mjs');

const SOUL_PRACTICE_HOOKS = [
  'data-mode="breathe"',
  'data-mode="om"',
  'data-mode="sleep"',
  'data-panel="stretch"',
  'data-panel="weights"',
];

function writeFixtureFile(root: string, relativePath: string, content: string) {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
}

function homeHtml(): string {
  const toolLinks = MODULE_REGISTRY.map(
    module =>
      `<a href="${module.routeHref}" data-module="${module.dataModule ?? module.id}">${module.displayName}</a>`
  ).join('\n');
  const soulHooks = SOUL_PRACTICE_HOOKS.map(
    hook => `<button ${hook}></button>`
  ).join('\n');
  return `<html><body>${toolLinks}${soulHooks}</body></html>`;
}

function createFixture(root: string) {
  writeFixtureFile(root, 'index.html', homeHtml());

  MODULE_REGISTRY.forEach(module => {
    // Each tool's page must exist on disk.
    writeFixtureFile(root, module.routeHref, '<html><body></body></html>');

    // Controllers export the required lifecycle.
    writeFixtureFile(
      root,
      module.ownerPath,
      `export const route = '${module.routeHref}';\nexport function init(){}\nexport function destroy(){}\n`
    );

    // Manifest + sidecars for the src/modules/<id>/ folder checks.
    const modulesMatch = module.ownerPath.match(/^src\/modules\/([^/]+)\//);
    if (!modulesMatch) return;
    const dirName = modulesMatch[1];
    const baseDir = `src/modules/${dirName}`;
    const manifest = {
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

  it('fails when a tool link or soul practice hook is missing from the home', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'arch-check-orbit-fail-'));
    try {
      createFixture(fixtureRoot);

      // A home without tool links or practice hooks must fail both checks.
      writeFixtureFile(fixtureRoot, 'index.html', '<html><body></body></html>');

      const result = runArchitectureCheck(fixtureRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('not linked from the home orbit');
      expect(result.stderr).toContain('Soul practice hook');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
