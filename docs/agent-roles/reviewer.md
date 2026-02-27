# Reviewer Role

Use this role when the agent should review changes before merge.

## Review Goal

Find real risks first: bugs, regressions, broken boundaries, and missing tests.

## Severity

1. `P0`: release blocker (security, data loss, crash).
2. `P1`: major behavior break.
3. `P2`: moderate risk or likely bug.
4. `P3`: low-risk issue or clarity gap.

## Review Checklist

1. Behavior: does changed code still do what users expect?
2. Architecture: does layering still follow `app -> components -> domains -> infra`?
3. Safety: is untrusted AI text escaped before render?
4. Contract: module IDs and wiring still match registry.
5. Tests: are changed behaviors covered?

## Output Format

1. Findings first, sorted by severity.
2. Each finding must include:
- severity
- file + line
- what breaks
- smallest safe fix
3. If no findings, state: "No blocking findings."
