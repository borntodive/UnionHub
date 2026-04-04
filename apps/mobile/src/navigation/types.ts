export type RootStackParamList = {
  Login: undefined;
  JoinUs: undefined;
  ChangePassword: undefined;
  CompleteProfile: undefined;
  MainTabs: undefined;
  MemberDetail: { memberId: string };
  MemberEdit: { memberId: string };
  MemberCreate: { sharedPdfUri?: string; extractedData?: any } | undefined;
  MemberOnboarding: {
    memberId: string;
    memberName: string;
    hasRegistrationForm: boolean;
  };
  // Public routes
  PublicDocuments: undefined;
  // Admin routes
  Bases: undefined;
  BaseForm: { baseId?: string };
  Contracts: undefined;
  ContractForm: { contractId?: string };
  Grades: undefined;
  GradeForm: { gradeId?: string };
  DeactivatedMembers: undefined;
  Statistics: undefined;
  BulkImport: undefined;
  PayslipCalculator: undefined;
  FtlCalculator: undefined;
  ColdTempCorrection: undefined;
  // CLA Contract Admin
  ClaContracts: undefined;
  ContractEditor: { contract?: any } | undefined;
  // Documents / Communications
  Documents: undefined;
  DocumentEditor: { documentId?: string } | undefined;
  PdfViewer: { documentId?: string; url?: string; title: string };
  PendingMembers: undefined;
  // Issues
  ReportIssue: undefined;
  MyIssues: undefined;
  MyIssueDetail: { issueId: string };
  Issues: undefined;
  IssueDetail: { issueId: string };
  IssueCategories: undefined;
  IssueCategoryForm: { categoryId?: string };
  IssueUrgencies: undefined;
  IssueUrgencyForm: { urgencyId?: string };
  // Gmail
  Gmail: undefined;
  EmailDetail: { messageId: string; subject: string; ruolo?: string };
  GmailSetup: undefined;
  // RAG
  RagAsk: undefined;
  RagAdmin: undefined;
  RagDocumentDetail: { documentId: string };
  // Backups
  Backups: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
