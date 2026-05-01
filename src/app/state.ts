import { MultilingualQuote } from '../components/reflection';
import { DEFAULT_USER_ID } from '../core/default-user';
import { createStore, type Store } from '../core/store';

export interface AppRuntimeState {
  currentUserId: string;
  todayKey: string;
  activeContentDate: Date;
  todaysQuote: MultilingualQuote | null;
}

export type AppStore = Store<AppRuntimeState>;

export function createAppRuntimeStore(): AppStore {
  return createStore<AppRuntimeState>({
    currentUserId: DEFAULT_USER_ID,
    todayKey: '',
    activeContentDate: new Date(),
    todaysQuote: null,
  });
}
