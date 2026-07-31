export type Task = {
  /** Stable UUID. Client-generated on creation, never invented by the server. */
  id: string;
  text: string;
  /**
   * A small, sanitized rich-text document for the task's supporting note.
   * It is optional so tasks created before notes existed remain valid.
   */
  note?: string;
  completed: boolean;
  position: number;
  parent_id?: string | null;
  /**
   * ISO timestamp, client-authoritative. Set on every local mutation and
   * written through to the server. Drives last-writer-wins merge during sync.
   */
  updated_at?: string;
  /**
   * ISO timestamp set once when the task is created. Used only as a
   * deterministic tiebreaker when ordering tasks that share a position.
   */
  created_at?: string;
};

/** A revisioned deletion, used by the To Do WAL and server tombstones. */
export type TaskDeletion = {
  id: string;
  deleted_at: string;
};
