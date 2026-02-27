# Experimental Source Archive

This folder stores legacy or experimental code that is intentionally outside the active runtime architecture.

Rules:

1. Do not import files from this folder into `src/*`.
2. Do not treat this folder as production source.
3. If promoting anything from here, move it back into `src/*` through the standard flow:
   - domain contract
   - infra adapter
   - UI wiring
   - verify (`npm run verify`)
