export type RootStackParamList = {
  Login: undefined;
  ChangePassword: undefined;
  CompleteProfile: undefined;
  MainTabs: undefined;
  MemberDetail: { memberId: string };
  MemberEdit: { memberId: string };
  MemberCreate: { sharedPdfUri?: string; extractedData?: any } | undefined;
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
  Chatbot: undefined;
  KnowledgeBase: undefined;
  // CLA Contract Admin
  ClaContracts: undefined;
  ContractEditor: { contract?: any } | undefined;
  // Documents / Communications
  Documents: undefined;
  DocumentEditor: { documentId?: string } | undefined;
  PdfViewer: { documentId: string; title: string };
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
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
