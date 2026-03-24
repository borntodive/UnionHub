export enum UserRole {
  SUPERADMIN = "superadmin",
  ADMIN = "admin",
  USER = "user",
}

export enum Ruolo {
  PILOT = "pilot",
  CABIN_CREW = "cabin_crew",
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
  rls?: boolean;
  registrationFormUrl?: string | null;
  dataIscrizione?: string | null;
  dateOfEntry?: string | null;
  dateOfCaptaincy?: string | null;
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

export enum IssueStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  SOLVED = "solved",
}

export interface IssueCategory {
  id: string;
  nameIt: string;
  nameEn: string;
  ruolo: Ruolo;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IssueUrgency {
  id: string;
  nameIt: string;
  nameEn: string;
  level: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  ruolo: Ruolo;
  status: IssueStatus;
  userId: string;
  user?: Pick<User, "id" | "crewcode" | "nome" | "cognome">;
  categoryId: string;
  category?: IssueCategory;
  urgencyId: string;
  urgency?: IssueUrgency;
  adminNotes?: string | null;
  solvedAt?: string | null;
  solvedById?: string | null;
  solvedBy?: Pick<User, "id" | "crewcode" | "nome" | "cognome"> | null;
  createdAt: string;
  updatedAt: string;
}
