import { describe, expect, it } from 'vitest';
import {
  __INTERNAL,
  getDayPlan,
  getStartOfWeek,
  type Exercise,
} from '../data';

const { djb2, pickExercises, PUSH_POOL, PULL_POOL, LEGS_POOL, UPPER_POOL } =
  __INTERNAL;

const ALL_POOLS: ReadonlyArray<ReadonlyArray<Exercise>> = [
  PUSH_POOL,
  PULL_POOL,
  LEGS_POOL,
  UPPER_POOL,
];

const VALID_EQUIPMENT = new Set([
  'dumbbells',
  'bands',
  'yoga_ball',
  'mat',
  'bodyweight',
]);

describe('getStartOfWeek', () => {
  it('returns the prior Sunday at 00:00 for a mid-week date', () => {
    // 2026-05-13 is a Wednesday.
    const wed = new Date(2026, 4, 13, 14, 30);
    const sunday = getStartOfWeek(wed);
    expect(sunday.getDay()).toBe(0);
    expect(sunday.getDate()).toBe(10);
    expect(sunday.getHours()).toBe(0);
    expect(sunday.getMinutes()).toBe(0);
  });

  it('returns the same Sunday when called on a Sunday', () => {
    const sun = new Date(2026, 4, 10, 9, 0);
    const result = getStartOfWeek(sun);
    expect(result.getDate()).toBe(10);
    expect(result.getHours()).toBe(0);
  });
});

describe('getDayPlan — schedule', () => {
  // Anchor: week of Sun 2026-05-10 to Sat 2026-05-16.
  const week = (offset: number) => new Date(2026, 4, 10 + offset);

  it('Sunday is a rest day with activities', () => {
    const plan = getDayPlan(week(0));
    expect(plan.type).toBe('rest');
    expect(plan.activities).toBeDefined();
    expect(plan.activities!.length).toBeGreaterThan(0);
    expect(plan.exercises).toBeUndefined();
  });

  it.each([
    [1, 'push'],
    [3, 'pull'],
    [5, 'legs'],
    [6, 'upper'],
  ] as const)('day offset %s maps to %s', (offset, type) => {
    const plan = getDayPlan(week(offset));
    expect(plan.type).toBe(type);
    expect(plan.exercises).toBeDefined();
    expect(plan.exercises!.length).toBe(3);
  });

  it.each([0, 2, 4] as const)('day offset %s is rest', offset => {
    expect(getDayPlan(week(offset)).type).toBe('rest');
  });
});

describe('getDayPlan — determinism + variety', () => {
  it('the same date returns the same exercises across calls', () => {
    const a = getDayPlan(new Date(2026, 4, 11));
    const b = getDayPlan(new Date(2026, 4, 11));
    expect(a.exercises!.map(e => e.name)).toEqual(b.exercises!.map(e => e.name));
  });

  it('the same week returns the same picks even from different in-week dates', () => {
    const mondayPlan = getDayPlan(new Date(2026, 4, 11));
    const mondayLater = getDayPlan(new Date(2026, 4, 11, 22, 0));
    expect(mondayLater.exercises!.map(e => e.name)).toEqual(
      mondayPlan.exercises!.map(e => e.name)
    );
  });

  it('different weeks produce a different push selection', () => {
    const wk1 = getDayPlan(new Date(2026, 4, 11)).exercises!.map(e => e.name);
    const wk2 = getDayPlan(new Date(2026, 4, 18)).exercises!.map(e => e.name);
    const wk3 = getDayPlan(new Date(2026, 4, 25)).exercises!.map(e => e.name);
    const allMatch =
      wk1.join(',') === wk2.join(',') && wk2.join(',') === wk3.join(',');
    expect(allMatch).toBe(false);
  });
});

describe('exercise pool integrity', () => {
  it('every category pool has at least 8 exercises', () => {
    for (const pool of ALL_POOLS) {
      expect(pool.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('every exercise has all required fields populated', () => {
    for (const pool of ALL_POOLS) {
      for (const exercise of pool) {
        expect(exercise.name.trim()).not.toBe('');
        expect(exercise.muscleGroups.trim()).not.toBe('');
        expect(exercise.sets.trim()).not.toBe('');
        expect(exercise.reps.trim()).not.toBe('');
        expect(exercise.rest.trim()).not.toBe('');
        expect(exercise.instructions.trim().length).toBeGreaterThan(20);
        expect(exercise.tips.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it('no duplicate exercise names within a single category', () => {
    for (const pool of ALL_POOLS) {
      const names = pool.map(e => e.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('every exercise has a non-empty equipment array with valid tags', () => {
    for (const pool of ALL_POOLS) {
      for (const exercise of pool) {
        expect(exercise.equipment.length).toBeGreaterThan(0);
        for (const tag of exercise.equipment) {
          expect(VALID_EQUIPMENT.has(tag)).toBe(true);
        }
      }
    }
  });

  it('no exercise requires gym-only equipment', () => {
    const gymKeywords = [
      'barbell',
      'cable',
      'machine',
      'lat pulldown',
      'leg press',
      'leg curl machine',
      'leg extension machine',
      'smith',
      'squat rack',
      'bench press',
      'dip station',
      'pull-up bar',
    ];
    for (const pool of ALL_POOLS) {
      for (const exercise of pool) {
        const lower = (
          exercise.name +
          exercise.instructions +
          exercise.equipment.join(' ')
        ).toLowerCase();
        for (const keyword of gymKeywords) {
          expect(lower).not.toContain(keyword);
        }
      }
    }
  });
});

describe('djb2 + pickExercises', () => {
  it('djb2 is deterministic', () => {
    expect(djb2('quantum-2026-05-10|push')).toBe(djb2('quantum-2026-05-10|push'));
    expect(djb2('a')).not.toBe(djb2('b'));
  });

  it('pickExercises returns the requested count without duplicates', () => {
    const picks = pickExercises(PUSH_POOL, 12345, 3);
    expect(picks.length).toBe(3);
    expect(new Set(picks.map(p => p.name)).size).toBe(3);
  });

  it('pickExercises is a deterministic function of (seed, pool)', () => {
    const a = pickExercises(LEGS_POOL, 99, 4);
    const b = pickExercises(LEGS_POOL, 99, 4);
    expect(a.map(x => x.name)).toEqual(b.map(x => x.name));
  });
});
