export interface ExerciseItem {
  name?: string;
  muscleGroups?: string;
  target?: string;
  sets?: string;
  reps?: string;
  rest?: string;
  instructions?: string;
  tips?: string;
}

export interface ExerciseDay {
  type: string;
  exercises?: ExerciseItem[];
  activities?: string[];
  notes?: string;
}

export interface WeeklyExerciseContent {
  sunday: ExerciseDay;
  monday: ExerciseDay;
  tuesday: ExerciseDay;
  wednesday: ExerciseDay;
  thursday: ExerciseDay;
  friday: ExerciseDay;
  saturday: ExerciseDay;
  [key: string]: ExerciseDay;
}
