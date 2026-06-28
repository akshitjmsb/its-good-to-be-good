/**
 * Vitest global setup — fills in env vars before any test module is imported,
 * so files that read them at import time (anything pulling in `infra/ai` or
 * `lib/convex`) don't blow up. These values are obviously fake and never see a
 * real network call (the Convex client is mocked in tests that exercise it).
 */
import { vi } from 'vitest';

vi.stubEnv('VITE_CONVEX_URL', 'https://test.convex.cloud');
vi.stubEnv('VITE_AI_PROVIDER', 'perplexity');
vi.stubEnv('VITE_PERPLEXITY_API_KEY', 'test-perplexity-key');
