import { User } from '../../users/entities/user.entity';
export declare class Base {
    id: string;
    codice: string;
    nome: string;
    users: User[];
    createdAt: Date;
    updatedAt: Date;
}
