import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

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
  trainingConfig?: {
    allowance?: number;
    nonBtc?: {
      allowance: number;
      simDiaria: { min: number; max: number; pay: { ffp: number; sectorPay: number } }[];
      bonus?: { sectorEquivalent: number };
    };
    btc?: {
      allowance: number;
      simDiaria: { min: number; max: number; pay: { ffp: number; sectorPay: number } }[];
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
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE';
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
  month?: number
): Promise<ClaContract | null> {
  const params = new URLSearchParams({ company, role, rank });
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());

  const response = await axios.get(`${API_BASE_URL}/cla-contracts?${params}`);
  return response.data;
}

// Admin endpoints - SuperAdmin only
export async function fetchAllClaContracts(year?: number): Promise<ClaContract[]> {
  const url = year 
    ? `${API_BASE_URL}/admin/cla-contracts?year=${year}`
    : `${API_BASE_URL}/admin/cla-contracts`;
  const response = await axios.get(url);
  return response.data;
}

export async function fetchClaContractHistory(contractId: string): Promise<ClaContractHistory[]> {
  const response = await axios.get(`${API_BASE_URL}/admin/cla-contracts/${contractId}/history`);
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
  trainingConfig?: ClaContract['trainingConfig'];
  effectiveYear?: number;
  effectiveMonth?: number;
  endYear?: number | null;
  endMonth?: number | null;
  isActive?: boolean;
}

export async function createClaContract(data: CreateClaContractData): Promise<ClaContract> {
  const response = await axios.post(`${API_BASE_URL}/admin/cla-contracts`, data);
  return response.data;
}

export async function updateClaContract(
  id: string,
  data: Partial<CreateClaContractData>
): Promise<ClaContract> {
  const response = await axios.put(`${API_BASE_URL}/admin/cla-contracts/${id}`, data);
  return response.data;
}

export async function deactivateClaContract(id: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/admin/cla-contracts/${id}`);
}

export async function activateClaContract(id: string): Promise<ClaContract> {
  const response = await axios.post(`${API_BASE_URL}/admin/cla-contracts/${id}/activate`);
  return response.data;
}

export async function cloneClaContract(id: string, year: number): Promise<ClaContract> {
  const response = await axios.post(`${API_BASE_URL}/admin/cla-contracts/${id}/clone`, { year });
  return response.data;
}
