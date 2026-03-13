import { UserRole } from '../../common/enums/user-role.enum';
import { Ruolo } from '../../common/enums/ruolo.enum';
import { Base } from '../../bases/entities/base.entity';
import { Contract } from '../../contracts/entities/contract.entity';
import { Grade } from '../../grades/entities/grade.entity';
import { UserStatusHistory } from './user-status-history.entity';
export interface StatusLogEntry {
    isActive: boolean;
    timestamp: string;
    reason?: string;
    performedBy?: string;
}
export declare class User {
    id: string;
    crewcode: string;
    password: string;
    role: UserRole;
    mustChangePassword: boolean;
    isActive: boolean;
    ruolo: Ruolo | null;
    nome: string;
    cognome: string;
    email: string;
    telefono: string | null;
    baseId: string | null;
    base: Base | null;
    contrattoId: string | null;
    contratto: Contract | null;
    gradeId: string | null;
    grade: Grade | null;
    note: string | null;
    itud: boolean;
    rsa: boolean;
    registrationFormUrl: string | null;
    dataIscrizione: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deactivatedAt: Date | null;
    statusLog: StatusLogEntry[] | null;
    statusHistory: UserStatusHistory[];
    get fullName(): string;
    serialize(forRole: UserRole): Partial<User>;
}
