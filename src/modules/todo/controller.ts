/**
 * Todo module controller.
 *
 * The Todo page is a React app whose Vite entry lives at `src/todo.tsx`
 * and renders into `todo.html`. From the home, this controller just
 * navigates the user there; the real UI is mounted by the page entry.
 */

import type { ModuleContext, ModuleController } from '../../sdk/types';

export const TODO_ROUTE = 'todo.html';

export function navigateTodoPage(): void {
  if (typeof window === 'undefined') return;
  window.location.href = TODO_ROUTE;
}

export const init: ModuleController['init'] = async (_ctx: ModuleContext) => {
  navigateTodoPage();
};

export const destroy: ModuleController['destroy'] = () => {
  // Page navigation owns its own teardown.
};

export const TodoModule: ModuleController = { init, destroy };
export default TodoModule;
