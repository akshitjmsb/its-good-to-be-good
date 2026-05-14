export type PoetrySelection = { poet: string; language: string; timestamp: number };

export type Task = {
  id?: string;
  text: string;
  completed: boolean;
  position: number;
  parent_id?: string | null;
};
