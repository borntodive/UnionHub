export enum UserRole {
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
  USER = 'user',
}

export enum Ruolo {
  PILOT = 'pilot',
  CABIN_CREW = 'cabin_crew',
}

export interface Base {
  id: string;
  codice: string;
  nome: string;
}

export interface Contract {
  id: string;
  codice: string;
  nome: string;
}

export interface Grade {
  id: string;
  codice: string;
  nome: string;
  ruolo: Ruolo;
}

export interface StatusLogEntry {
  isActive: boolean;
  timestamp: string;
  reason?: string;
  performedBy?: string;
}

export interface User {
  id: string;
  crewcode: string;
  role: UserRole;
  ruolo: Ruolo | null;
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  base?: Base;
  contratto?: Contract;
  grade?: Grade;
  isActive: boolean;
  mustChangePassword: boolean;
  note?: string;
  itud?: boolean;
  rsa?: boolean;
  registrationFormUrl?: string | null;
  dataIscrizione?: string | null;
  deactivatedAt?: string | null;
  statusLog?: StatusLogEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface LoginCredentials {
  crewcode: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}
