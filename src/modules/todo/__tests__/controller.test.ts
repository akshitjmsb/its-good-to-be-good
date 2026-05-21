import { describe, expect, it } from 'vitest';
import {
  TODO_ROUTE,
  TodoModule,
  destroy,
  init,
  navigateTodoPage,
} from '../controller';

describe('Todo module controller', () => {
  it('exposes init/destroy and the legacy navigateTodoPage', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof navigateTodoPage).toBe('function');
    expect(TodoModule.init).toBe(init);
    expect(TodoModule.destroy).toBe(destroy);
  });

  it('routes to todo.html', () => {
    expect(TODO_ROUTE).toBe('todo.html');
  });
});
