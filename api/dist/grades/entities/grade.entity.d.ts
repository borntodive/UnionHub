import { User } from '../../users/entities/user.entity';
export declare enum Ruolo {
    PILOT = "pilot",
    CABIN_CREW = "cabin_crew"
}
export declare class Grade {
    id: string;
    codice: string;
    nome: string;
    ruolo: Ruolo;
    users: User[];
    createdAt: Date;
    updatedAt: Date;
}
