#!/usr/bin/env node

// Local runtime smoke test
// Usage:
// 1) Start app: npm run dev
// 2) Run: node test-content-generation.js

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

const pages = [
  '/',
  '/todo.html',
  '/french.html',
  '/health.html',
  '/travel.html'
];

async function testPage(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url);
    const ok = res.status >= 200 && res.status < 400;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${res.status} ${url}`);
    return ok;
  } catch (err) {
    console.log(`FAIL ERR ${url} -> ${err.message}`);
    return false;
  }
}

async function run() {
  console.log(`Testing local app at ${BASE_URL}`);
  let firstConnectionError = false;
  let passCount = 0;

  for (const path of pages) {
    const ok = await testPage(path);
    if (!ok && path === '/') {
      firstConnectionError = true;
    }
    if (ok) passCount += 1;
  }

  if (firstConnectionError) {
    console.log('\nTip: Start the dev server first with `npm run dev`.');
  }

  console.log(`\nSummary: ${passCount}/${pages.length} pages reachable`);

  if (passCount !== pages.length) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
