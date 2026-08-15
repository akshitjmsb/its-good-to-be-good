import { describe, expect, it } from 'vitest';
import { renderExerciseView } from '../exercise-view';

describe('renderExerciseView', () => {
  it('renders only today\'s three exercise pointers', () => {
    const container = { innerHTML: '' } as HTMLElement;
    renderExerciseView(container, new Date(2026, 7, 15, 13));

    expect(container.innerHTML).toContain('Upper');
    expect(container.innerHTML.match(/class="ex-pointer"/g)).toHaveLength(3);
    expect(container.innerHTML).not.toContain('ex-cal');
    expect(container.innerHTML).not.toContain('<button');
    expect(container.innerHTML).not.toContain('<details');
    expect(container.innerHTML).not.toContain('How to');
    expect(container.innerHTML).not.toContain('Stretch');
  });

  it('renders a single rest pointer on a rest day', () => {
    const container = { innerHTML: '' } as HTMLElement;
    renderExerciseView(container, new Date(2026, 7, 16, 13));

    expect(container.innerHTML).toContain('Rest');
    expect(container.innerHTML).not.toContain('<li');
  });
});
