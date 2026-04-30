export interface ChatResponse {
  answer: string;
  sources: string[];
}

export interface RagStatus {
  lastReindexAt: string | null;
  totalChunks: number;
}

export interface DocumentCategory {
  name: string;
  files: string[];
}

export type ReindexPhase =
  | "idle"
  | "discovering"
  | "loading"
  | "splitting"
  | "embedding"
  | "inserting"
  | "done"
  | "error";

export interface ReindexProgress {
  isRunning: boolean;
  phase: ReindexPhase;
  current: number;
  total: number;
  message: string;
  percent: number;
  estimatedTimeRemaining: number; // in seconds
}
