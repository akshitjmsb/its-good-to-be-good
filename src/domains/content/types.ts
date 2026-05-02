export type ContentType =
  | 'analytics'
  | 'transportation-physics'
  | 'classic-rock-500'
  | 'weekly-exercise'
  | 'food-plan';

export interface AnalyticsQuestionTopic {
  title: string;
  prompt: string;
  solution: string;
}

export interface AnalyticsExplanationTopic {
  title: string;
  explanation: string;
}

export interface AnalyticsDataQualityTopic {
  title: string;
  dataType: string;
  issues: string[];
  transformations: string[];
}

export interface AnalyticsContent {
  sql: AnalyticsQuestionTopic;
  dax: AnalyticsQuestionTopic;
  snowflake: AnalyticsQuestionTopic;
  dbt: AnalyticsQuestionTopic;
  dataManagement: AnalyticsExplanationTopic;
  dataQuality: AnalyticsDataQualityTopic;
}

export interface PhysicsContent {
  title: string;
  explanation: string;
}

export interface ExerciseItem {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  muscleGroup?: string;
  muscleGroups?: string;
  target?: string;
  instructions?: string;
  tips?: string;
}

export interface ExerciseDay {
  type: string;
  exercises?: ExerciseItem[];
  activities?: string[];
  notes?: string;
}

export interface ExerciseWeeklyContent {
  sunday: ExerciseDay;
  monday: ExerciseDay;
  tuesday: ExerciseDay;
  wednesday: ExerciseDay;
  thursday: ExerciseDay;
  friday: ExerciseDay;
  saturday: ExerciseDay;
  [key: string]: ExerciseDay;
}

export type GuitarPoolItem = {
  title: string;
  artist: string;
};

export type FoodPlanText = string;
