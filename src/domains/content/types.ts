export type ContentType =
  | 'analytics'
  | 'transportation-physics';

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
