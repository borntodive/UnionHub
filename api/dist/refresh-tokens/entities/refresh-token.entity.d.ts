import { User } from '../../users/entities/user.entity';
export declare class RefreshToken {
    id: string;
    userId: string;
    user: User;
    token: string;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    isRevoked: boolean;
    createdAt: Date;
    isExpired(): boolean;
    isValid(): boolean;
}
