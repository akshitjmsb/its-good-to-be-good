import type { ProviderId } from '../../infra/ai/providers/types';

const STORAGE_KEY = 'king.ai.provider';
const DEFAULT_PROVIDER: ProviderId = 'perplexity';
const VALID_PROVIDERS: ReadonlySet<string> = new Set<ProviderId>([
  'perplexity',
  'claude',
  'qwen-local',
]);

type Listener = (id: ProviderId) => void;
const listeners = new Set<Listener>();

function readFromStorage(): ProviderId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && VALID_PROVIDERS.has(raw)) return raw as ProviderId;
  } catch {
    // localStorage may be unavailable (SSR, privacy mode) — fall through to default.
  }
  return DEFAULT_PROVIDER;
}

let current: ProviderId = readFromStorage();

export function getSelectedProvider(): ProviderId {
  return current;
}

export function setSelectedProvider(id: ProviderId): void {
  if (!VALID_PROVIDERS.has(id) || current === id) return;
  current = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore — selection survives in-memory for the session
  }
  listeners.forEach(listener => listener(id));
}

export function onProviderChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
