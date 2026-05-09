export type RootStackParamList = {
  Login: undefined;
  JoinUs: undefined;
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
  // CLA Contract Admin
  // VOLMET / Airports
  Volmet: undefined;
  AirportsAdmin: undefined;
  VolmetAdmin: undefined; // legacy, for backwards compatibility
  VolmetForm: { volmetId?: string };
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
  Chatbot: undefined;
  ChatRequests: undefined;
  ChatRequestDetail: { requestId: string };
  Backups: undefined;
  KbAdmin: undefined;
};

export type DrawerParamList = {
  Home: undefined;
  Members: undefined;
  MemberDetail: { memberId: string };
  MemberEdit: { memberId: string };
  MemberCreate: { sharedPdfUri?: string; extractedData?: any } | undefined;
  MemberOnboarding: {
    memberId: string;
    memberName: string;
    hasRegistrationForm: boolean;
  };
  Notifications: undefined;
  Settings: undefined;
  PublicDocuments: undefined;
  PayslipCalculator: undefined;
  FtlCalculator: undefined;
  ColdTempCorrection: undefined;
  // VOLMET / Airports
  Volmet: undefined;
  AirportsAdmin: undefined;
  VolmetAdmin: undefined; // legacy, for backwards compatibility
  VolmetForm: { volmetId?: string };
  ReportIssue: undefined;
  MyIssues: undefined;
  Issues: undefined;
  IssueDetail: { issueId: string };
  PendingMembers: undefined;
  Documents: undefined;
  DocumentEditor: { documentId?: string } | undefined;
  Statistics: undefined;
  BulkImport: undefined;
  Contracts: undefined;
  ContractForm: { contractId?: string };
  ClaContracts: undefined;
  ContractEditor: { contract?: any } | undefined;
  DeactivatedMembers: undefined;
  Bases: undefined;
  BaseForm: { baseId?: string };
  Grades: undefined;
  GradeForm: { gradeId?: string };
  IssueCategories: undefined;
  IssueCategoryForm: { categoryId?: string };
  IssueUrgencies: undefined;
  IssueUrgencyForm: { urgencyId?: string };
  GmailSetup: undefined;
  Gmail: undefined;
  Backups: undefined;
  KbAdmin: undefined;
  ChatRequests: undefined;
  ChatRequestDetail: { requestId: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
