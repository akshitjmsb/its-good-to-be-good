export type Task = {
  /** Stable UUID. Client-generated on creation, never invented by the server. */
  id: string;
  text: string;
  completed: boolean;
  position: number;
  parent_id?: string | null;
  /**
   * ISO timestamp, client-authoritative. Set on every local mutation and
   * written through to the server. Drives last-writer-wins merge during sync.
   */
  updated_at?: string;
  /**
   * ISO timestamp owned by the server (read-only on the client, omitted from
   * upserts so the server keeps its own value). Used only as a deterministic
   * tiebreaker when ordering tasks that share a position.
   */
  created_at?: string;
};
