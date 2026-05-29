export type PoetrySelection = { poet: string; language: string; timestamp: number };

export type Task = {
  /** Stable UUID. Client-generated on creation, never invented by the server. */
  id: string;
  text: string;
  completed: boolean;
  position: number;
  parent_id?: string | null;
};
