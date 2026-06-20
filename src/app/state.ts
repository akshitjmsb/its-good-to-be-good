import type { MultilingualQuote } from '../components/reflection';
import { createStore, type Store } from '../core/store';

export interface AppRuntimeState {
  /** Authed user id, or null while the login gate is mounted. */
  currentUserId: string | null;
  todayKey: string;
  activeContentDate: Date;
  todaysQuote: MultilingualQuote | null;
}

export type AppStore = Store<AppRuntimeState>;

export function createAppRuntimeStore(): AppStore {
  return createStore<AppRuntimeState>({
    currentUserId: null,
    todayKey: '',
    activeContentDate: new Date(),
    todaysQuote: null,
  });
}
