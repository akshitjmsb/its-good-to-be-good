import { describe, expect, it } from 'vitest';
import { ExerciseModule, destroy, init, showExerciseModal } from '../controller';

describe('Exercise module controller', () => {
  it('exposes init/destroy and the legacy showExerciseModal entry', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof showExerciseModal).toBe('function');
    expect(ExerciseModule.init).toBe(init);
    expect(ExerciseModule.destroy).toBe(destroy);
  });
});
