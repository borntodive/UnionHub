/**
 * Centralized TanStack Query keys.
 * Use these constants everywhere instead of inline string arrays to keep
 * invalidation logic consistent across screens.
 */
export const QUERY_KEYS = {
  // Auth / User
  me: ["me"] as const,

  // Members
  users: (filters?: object) =>
    filters ? (["users", filters] as const) : (["users"] as const),

  // Issues
  adminIssues: ["adminIssues"] as const,
  myIssues: ["myIssues"] as const,
  issue: (id: string) => ["issue", id] as const,

  // Documents
  documents: ["documents"] as const,
  document: (id: string) => ["document", id] as const,

  // Reference data
  bases: ["bases"] as const,
  contracts: ["contracts"] as const,
  grades: ["grades"] as const,
  claContracts: ["claContracts"] as const,

  // Issue config
  issueCategories: (ruolo?: string) =>
    ruolo
      ? (["issueCategories", ruolo] as const)
      : (["issueCategories"] as const),
  issueUrgencies: ["issueUrgencies"] as const,

  // Home stats
  homeStats: ["homeStats"] as const,

  // Notifications
  notifications: ["notifications"] as const,
} as const;
