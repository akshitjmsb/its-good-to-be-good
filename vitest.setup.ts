/**
 * Vitest global setup — fills in the Supabase env vars before any test
 * module is imported, so files that touch `src/lib/supabase.ts` at import
 * time (anything pulling in `infra/ai` or `infra/supabase`) don't blow
 * up. These values are obviously fake and never see a real network call.
 */
import { vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
vi.stubEnv('VITE_AI_PROVIDER', 'perplexity');
vi.stubEnv('VITE_PERPLEXITY_API_KEY', 'test-perplexity-key');
