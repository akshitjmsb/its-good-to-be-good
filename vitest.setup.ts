/**
 * Vitest global setup — fills in env vars before any test module is imported,
 * so files that read them at import time (anything pulling in the Convex
 * client) don't blow up. The value is obviously fake and never sees a real
 * network call (the Convex client is mocked in tests that exercise it).
 */
import { vi } from 'vitest';

vi.stubEnv('VITE_CONVEX_URL', 'https://test.convex.cloud');
