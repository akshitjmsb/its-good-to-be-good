/**
 * To Do's save controller — the SDK's generic crash-safe controller typed
 * to the task snapshot. The mechanism (derived dirty flag, serialized
 * flush loop, backoff + offline parking, auth gating) lives in
 * `src/sdk/durable.ts`.
 */

import { SaveController as GenericSaveController } from '../../sdk/durable';
import type { SaveControllerDeps } from '../../sdk/durable';
import type { WalSnapshot } from './wal';

export type { SaveStatus } from '../../sdk/durable';
export type TodoSaveControllerDeps = SaveControllerDeps<WalSnapshot>;

export class SaveController extends GenericSaveController<WalSnapshot> {}
