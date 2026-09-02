import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const scriptPath = path.join(repoRoot, 'scripts/check-architecture.mjs');

// Mirrors EXPECTED_MODULES in scripts/check-architecture.mjs.
const MODULES: Record<string, 'circle' | 'square'> = {
  being: 'circle',
  food: 'circle',
  todo: 'square',
  'khyaali-bhoot': 'square',
  tennis: 'square',
};

const SOUL_HOOKS = [
  'data-panel="sleep"',
  'data-panel="food"',
  'data-panel="movement"',
  'data-panel="mindfulness"',
  'data-panel="rooh"',
];

const MINDFULNESS_HOOKS = [
  'data-mode="breathe"',
  'data-mode="om"',
  'data-mode="focus"',
];

const CIRCLE_ROUTES: Record<string, string[]> = {
  being: ['sleep.html', 'movement.html', 'mindfulness.html', 'rooh.html'],
  food: ['food.html'],
};

function writeFixtureFile(root: string, relativePath: string, content: string) {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');
}

function homeHtml(): string {
  const toolLinks = Object.entries(MODULES)
    .filter(([, ring]) => ring === 'square')
    .map(([id]) => `<a class="orbit-tool" href="${id}.html">${id}</a>`)
    .join('\n');
  const soulLinks = SOUL_HOOKS.map((hook, index) => {
    const routes = [...CIRCLE_ROUTES.being, ...CIRCLE_ROUTES.food];
    return `<a ${hook} href="${routes[index]}"></a>`;
  }).join('\n');
  return `<html><body>${toolLinks}${soulLinks}</body></html>`;
}

function createFixture(root: string) {
  writeFixtureFile(root, 'index.html', homeHtml());
  writeFixtureFile(root, 'src/modules/being/orbit.ts', 'export {};\n');
  writeFixtureFile(
    root,
    'mindfulness.html',
    `${MINDFULNESS_HOOKS.map(hook => `<button ${hook}></button>`).join('\n')}<script type="module" src="src/modules/being/mindfulness-entry.ts"></script>`
  );
  writeFixtureFile(
    root,
    'src/modules/being/__tests__/orbit.test.ts',
    'export {};\n'
  );

  for (const [id, ring] of Object.entries(MODULES)) {
    const baseDir = `src/modules/${id}`;
    const manifest: Record<string, unknown> = {
      id,
      displayName: id,
      ring,
      icon: './icon.svg',
      version: '0.1.0',
      renderer: 'dom',
    };
    if (ring === 'square') {
      manifest.routeHref = `${id}.html`;
      writeFixtureFile(
        root,
        `${id}.html`,
        `<html><body><script type="module" src="${baseDir}/entry.ts"></script></body></html>`
      );
      writeFixtureFile(root, `${baseDir}/entry.ts`, 'export {};\n');
    } else {
      manifest.routeHrefs = CIRCLE_ROUTES[id];
      for (const routeHref of CIRCLE_ROUTES[id]) {
        const entryName =
          id === 'food' ? 'entry.ts' : routeHref.replace('.html', '-entry.ts');
        const pageSource =
          routeHref === 'mindfulness.html'
            ? `${MINDFULNESS_HOOKS.map(hook => `<button ${hook}></button>`).join('\n')}<script type="module" src="${baseDir}/${entryName}"></script>`
            : `<html><body><script type="module" src="${baseDir}/${entryName}"></script></body></html>`;
        writeFixtureFile(root, routeHref, pageSource);
        writeFixtureFile(root, `${baseDir}/${entryName}`, 'export {};\n');
      }
    }
    writeFixtureFile(
      root,
      `${baseDir}/manifest.json`,
      JSON.stringify(manifest, null, 2) + '\n'
    );
    writeFixtureFile(root, `${baseDir}/icon.svg`, '<svg></svg>\n');
    writeFixtureFile(root, `${baseDir}/AGENT.md`, `# ${id}\n`);
  }

  writeFixtureFile(root, 'src/platform/safe.ts', 'export const safe = true;');
  writeFixtureFile(root, 'src/sdk/safe.ts', 'export const safe = true;');
}

function runArchitectureCheck(root: string) {
  return spawnSync('node', [scriptPath], {
    cwd: repoRoot,
    env: { ...process.env, ARCH_CHECK_ROOT: root },
    encoding: 'utf8',
  });
}

describe('architecture check script', () => {
  it('passes for a valid fixture', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'arch-check-valid-'));
    try {
      createFixture(fixtureRoot);
      const result = runArchitectureCheck(fixtureRoot);
      expect(result.stderr).toBe('');
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('Architecture guard check passed.');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('fails when a circle module carries the legacy singular routeHref', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'arch-check-circle-fail-'));
    try {
      createFixture(fixtureRoot);
      writeFixtureFile(
        fixtureRoot,
        'src/modules/being/manifest.json',
        JSON.stringify(
          {
            id: 'being',
            displayName: 'being',
            ring: 'circle',
            routeHref: 'being.html',
            routeHrefs: CIRCLE_ROUTES.being,
            icon: './icon.svg',
            version: '0.1.0',
          },
          null,
          2
        )
      );

      const result = runArchitectureCheck(fixtureRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('must use routeHrefs');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('fails when a square tool is not linked from the home', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'arch-check-square-fail-'));
    try {
      createFixture(fixtureRoot);
      writeFixtureFile(fixtureRoot, 'index.html', '<html><body></body></html>');

      const result = runArchitectureCheck(fixtureRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('not linked from the home orbit');
      expect(result.stderr).toContain('Soul practice hook');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('fails when the foundation reaches up into modules', () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'arch-check-layer-fail-'));
    try {
      createFixture(fixtureRoot);
      writeFixtureFile(
        fixtureRoot,
        'src/platform/bad.ts',
        "import '../modules/todo/model';\nexport const bad = true;\n"
      );

      const result = runArchitectureCheck(fixtureRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Forbidden import');
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
