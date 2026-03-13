import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto, ForceChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { User } from '../users/entities/user.entity';
interface RequestWithUser extends Request {
    user: {
        userId: string;
        crewcode: string;
        role: string;
        ruolo: string | null;
    };
}
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto, ip: string, userAgent: string): Promise<AuthResponseDto>;
    refreshTokens(refreshTokenDto: RefreshTokenDto, ip: string, userAgent: string): Promise<AuthResponseDto>;
    logout(refreshTokenDto: RefreshTokenDto): Promise<{
        message: string;
    }>;
    logoutAllDevices(req: RequestWithUser): Promise<{
        message: string;
    }>;
    changePassword(req: RequestWithUser, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    forceChangePassword(req: RequestWithUser, forceChangePasswordDto: ForceChangePasswordDto): Promise<{
        message: string;
    }>;
    getProfile(req: RequestWithUser): Promise<Partial<User>>;
}
export {};
