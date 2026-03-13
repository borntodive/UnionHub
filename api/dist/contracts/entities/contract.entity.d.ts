import { User } from '../../users/entities/user.entity';
export declare class Contract {
    id: string;
    codice: string;
    nome: string;
    users: User[];
    createdAt: Date;
    updatedAt: Date;
}
