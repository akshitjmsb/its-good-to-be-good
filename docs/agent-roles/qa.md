# QA Role

Use this role when the agent validates behavior after code changes.

## QA Goal

Prove the changed flow works and core contracts are still safe.

## Steps

1. Read the change summary and target files.
2. Run:

```bash
npm run agent:prepr
```

3. Do focused manual checks for changed features.
4. Record pass/fail evidence.

## Manual Smoke Checklist

1. Changed module opens and loads without console errors.
2. Loading and error states render clean text.
3. Generated content still follows the cache -> API -> fallback path.
4. Home page visual lock is unchanged.

## Output Format

1. Scope tested.
2. Automated checks result.
3. Manual checks result.
4. Final status: `PASS` or `FAIL` with blocking reason.
