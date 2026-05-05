export interface WikiPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  path: string;
  category: WikiCategory;
  tags: string[];
  sourceDocument?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export type WikiCategory =
  | "entities"
  | "concepts"
  | "sources"
  | "comparisons"
  | "queries";

export interface IngestProgress {
  isRunning: boolean;
  phase: IngestPhase;
  current: number;
  total: number;
  message: string;
  percent: number;
}

export type IngestPhase =
  | "idle"
  | "discovering"
  | "parsing"
  | "embedding"
  | "saving"
  | "done"
  | "error";

export interface LintIssue {
  type: "orphan" | "broken-link" | "missing-tags" | "duplicate";
  severity: "error" | "warning";
  message: string;
  path?: string;
}

export interface WikiIndex {
  pages: Array<{
    title: string;
    slug: string;
    category: WikiCategory;
    path: string;
    tags: string[];
  }>;
  lastUpdated: string;
}

export interface WikiPageInput {
  title: string;
  slug: string;
  content: string;
  path: string;
  category: WikiCategory;
  tags: string[];
  sourceDocument?: string;
  metadata?: Record<string, unknown>;
}

export interface WikiPageCreateInput {
  title: string;
  slug: string;
  content: string;
  path: string;
  category: WikiCategory;
  tags: string[];
  sourceDocument?: string;
  metadata: Record<string, unknown>;
}

export interface IngestResult {
  pagesCreated: number;
  pagesUpdated: number;
}
