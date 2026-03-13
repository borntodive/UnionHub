import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RefreshToken } from '../refresh-tokens/entities/refresh-token.entity';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, ForceChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { User } from '../users/entities/user.entity';
export declare class AuthService {
    private usersService;
    private jwtService;
    private configService;
    private refreshTokenRepository;
    constructor(usersService: UsersService, jwtService: JwtService, configService: ConfigService, refreshTokenRepository: Repository<RefreshToken>);
    login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto>;
    refreshTokens(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto>;
    logout(refreshToken: string): Promise<void>;
    logoutAllDevices(userId: string): Promise<void>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto | ForceChangePasswordDto, isForced?: boolean): Promise<void>;
    getProfile(userId: string): Promise<Partial<User>>;
    private generateTokens;
}
