import { MultilingualQuote } from '../components/reflection';
import { DEFAULT_USER_ID } from '../core/default-user';
import { Task } from '../types';

export interface AppRuntimeState {
  currentUserId: string;
  todayKey: string;
  activeContentDate: Date;
  todaysQuote: MultilingualQuote | null;
  tasks: Task[];
}

export function createAppRuntimeState(): AppRuntimeState {
  return {
    currentUserId: DEFAULT_USER_ID,
    todayKey: '',
    activeContentDate: new Date(),
    todaysQuote: null,
    tasks: [],
  };
}
