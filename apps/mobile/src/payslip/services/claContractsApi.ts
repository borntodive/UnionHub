import apiClient from "../../api/client";

export interface ClaContract {
  id: string;
  company: string;
  role: string;
  rank: string;
  basic: number;
  ffp: number;
  sbh: number;
  al: number;
  oob: number;
  woff: number;
  allowance: number;
  diaria: number;
  rsa: number;
  itud: number;
  trainingConfig?: {
    allowance?: number;
    nonBtc?: {
      allowance: number;
      simDiaria: {
        min: number;
        max: number;
        pay: { ffp: number; sectorPay: number };
      }[];
      bonus?: { sectorEquivalent: number };
    };
    btc?: {
      allowance: number;
      simDiaria: {
        min: number;
        max: number;
        pay: { ffp: number; sectorPay: number };
      }[];
      bonus?: { sectorEquivalent: number };
    };
    bonus?: {
      pay: { min: number; max: number; pay: number }[];
      minSectors: number;
      sectorEquivalent?: number;
    };
  };
  effectiveYear: number;
  effectiveMonth: number;
  endYear: number | null;
  endMonth: number | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClaContractHistory {
  id: string;
  contractId: string | null;
  action: "CREATE" | "UPDATE" | "DELETE" | "ACTIVATE" | "DEACTIVATE";
  performedBy: string;
  performerCrewcode: string;
  dataSnapshot: Partial<ClaContract>;
  changes?: { field: string; oldValue: any; newValue: any }[];
  createdAt: string;
}

// Public endpoint - used by calculator
export async function fetchClaContract(
  company: string,
  role: string,
  rank: string,
  year?: number,
  month?: number,
): Promise<ClaContract | null> {
  const params = new URLSearchParams({ company, role, rank });
  if (year) params.append("year", year.toString());
  if (month) params.append("month", month.toString());

  const response = await apiClient.get(`/cla-contracts?${params}`);
  return response.data;
}

// Admin endpoints - SuperAdmin only
export async function fetchAllClaContracts(
  year?: number,
): Promise<ClaContract[]> {
  const url = year
    ? `/admin/cla-contracts?year=${year}`
    : `/admin/cla-contracts`;
  const response = await apiClient.get(url);
  return response.data;
}

export async function fetchClaContractHistory(
  contractId: string,
): Promise<ClaContractHistory[]> {
  const response = await apiClient.get(
    `/admin/cla-contracts/${contractId}/history`,
  );
  return response.data;
}

export interface CreateClaContractData {
  company?: string;
  role: string;
  rank: string;
  basic: number;
  ffp: number;
  sbh: number;
  al: number;
  oob: number;
  woff?: number;
  allowance: number;
  diaria: number;
  rsa?: number;
  itud?: number;
  trainingConfig?: ClaContract["trainingConfig"];
  effectiveYear?: number;
  effectiveMonth?: number;
  endYear?: number | null;
  endMonth?: number | null;
  isActive?: boolean;
}

export async function createClaContract(
  data: CreateClaContractData,
): Promise<ClaContract> {
  const response = await apiClient.post(`/admin/cla-contracts`, data);
  return response.data;
}

export async function updateClaContract(
  id: string,
  data: Partial<CreateClaContractData>,
): Promise<ClaContract> {
  const response = await apiClient.put(`/admin/cla-contracts/${id}`, data);
  return response.data;
}

export async function deactivateClaContract(id: string): Promise<void> {
  await apiClient.delete(`/admin/cla-contracts/${id}`);
}

export async function activateClaContract(id: string): Promise<ClaContract> {
  const response = await apiClient.post(`/admin/cla-contracts/${id}/activate`);
  return response.data;
}

export async function cloneClaContract(
  id: string,
  year: number,
  isActive: boolean = true,
  effectiveMonth: number = 1,
): Promise<ClaContract> {
  const response = await apiClient.post(`/admin/cla-contracts/${id}/clone`, {
    year,
    isActive,
    effectiveMonth,
  });
  return response.data;
}

export async function closeClaContract(
  id: string,
  endYear: number,
  endMonth: number,
): Promise<ClaContract> {
  const response = await apiClient.post(`/admin/cla-contracts/${id}/close`, {
    endYear,
    endMonth,
  });
  return response.data;
}

export async function deleteAllClaContractsForYear(
  year: number,
): Promise<{ deleted: number }> {
  const response = await apiClient.delete(`/admin/cla-contracts/year/${year}`);
  return response.data;
}
