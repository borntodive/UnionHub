export type RootStackParamList = {
  Login: undefined;
  ChangePassword: undefined;
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
  // CLA Contract Admin
  ClaContracts: undefined;
  ContractEditor: { contract?: any } | undefined;
  // Documents / Communications
  Documents: undefined;
  DocumentEditor: { documentId?: string } | undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
