import { UserRole } from '../../common/enums/user-role.enum';
import { Ruolo } from '../../common/enums/ruolo.enum';
export declare class CreateUserDto {
    crewcode: string;
    nome: string;
    cognome: string;
    email: string;
    telefono?: string;
    ruolo?: Ruolo;
    role?: UserRole;
    baseId?: string;
    contrattoId?: string;
    gradeId?: string;
    note?: string;
    itud?: boolean;
    rsa?: boolean;
    dataIscrizione?: string;
}
