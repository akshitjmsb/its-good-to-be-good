#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

function runGit(args, allowFailure = false) {
  const result = spawnSync('git', args, { encoding: 'utf8' });

  if (result.status !== 0 && !allowFailure) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const reason = stderr || stdout || 'unknown git error';
    throw new Error(`git ${args.join(' ')} failed: ${reason}`);
  }

  return result;
}

function resolveDiffBase() {
  const baseRef = process.env.AGENT_BASE_REF || 'origin/prod';
  const mergeBase = runGit(['merge-base', 'HEAD', baseRef], true);

  if (mergeBase.status === 0) {
    return mergeBase.stdout.trim();
  }

  const previousCommit = runGit(['rev-parse', 'HEAD~1'], true);
  if (previousCommit.status === 0) {
    return previousCommit.stdout.trim();
  }

  return null;
}

function getChangedTestFiles(baseCommit) {
  const diffArgs = ['diff', '--name-only', '--diff-filter=ACMR'];
  if (baseCommit) {
    diffArgs.push(`${baseCommit}...HEAD`);
  }

  const diffResult = runGit(diffArgs);
  const changedFiles = diffResult.stdout
    .split('\n')
    .map(file => file.trim())
    .filter(Boolean);

  return changedFiles.filter(file => TEST_FILE_PATTERN.test(file));
}

function runChangedTests(testFiles) {
  const args = ['run', 'test', '--', ...testFiles];
  const result = spawnSync('npm', args, { stdio: 'inherit' });
  return result.status ?? 1;
}

function main() {
  const baseCommit = resolveDiffBase();
  const changedTestFiles = getChangedTestFiles(baseCommit);

  if (changedTestFiles.length === 0) {
    const baseLabel = baseCommit || 'HEAD';
    console.log(
      `No changed test files found against ${baseLabel}. Skipping changed-test run.`
    );
    process.exit(0);
  }

  console.log(
    `Running ${changedTestFiles.length} changed test file(s) from ${baseCommit}:`
  );
  changedTestFiles.forEach(file => console.log(`- ${file}`));

  const status = runChangedTests(changedTestFiles);
  process.exit(status);
}

main();
