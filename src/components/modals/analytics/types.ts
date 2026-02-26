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
  sql?: AnalyticsQuestionTopic;
  dax?: AnalyticsQuestionTopic;
  snowflake?: AnalyticsQuestionTopic;
  dbt?: AnalyticsQuestionTopic;
  dataManagement?: AnalyticsExplanationTopic;
  dataQuality?: AnalyticsDataQualityTopic;
}

export type AnalyticsTopic =
  | {
      type: string;
      icon: string;
      isQuestion: true;
      data: AnalyticsQuestionTopic;
    }
  | {
      type: string;
      icon: string;
      isQuestion?: false;
      data: AnalyticsExplanationTopic | AnalyticsDataQualityTopic;
    };
