import { User } from '../../users/entities/user.entity';
export declare class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
    expiresIn: number;
}
export declare class TokenPayloadDto {
    sub: string;
    crewcode: string;
    role: string;
    ruolo: string | null;
    iat?: number;
    exp?: number;
}
