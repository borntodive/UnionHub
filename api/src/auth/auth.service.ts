import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { UsersService } from "../users/users.service";
import { RefreshToken } from "../refresh-tokens/entities/refresh-token.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { LoginDto } from "./dto/login.dto";
import {
  ChangePasswordDto,
  ForceChangePasswordDto,
} from "./dto/change-password.dto";
import { AuthResponseDto, TokenPayloadDto } from "./dto/auth-response.dto";
import { User } from "../users/entities/user.entity";

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_DELAY_MS = 30000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private getLoginDelay(crewcode: string): number {
    const entry = loginAttempts.get(crewcode);
    if (!entry) return 0;
    const elapsed = Date.now() - entry.lastAttempt;
    if (elapsed > 15 * 60 * 1000) {
      loginAttempts.delete(crewcode);
      return 0;
    }
    return Math.min(Math.pow(2, entry.count) * 500, MAX_LOGIN_DELAY_MS);
  }

  private recordFailedAttempt(crewcode: string): void {
    const entry = loginAttempts.get(crewcode);
    if (entry) {
      entry.count++;
      entry.lastAttempt = Date.now();
    } else {
      loginAttempts.set(crewcode, { count: 1, lastAttempt: Date.now() });
    }
  }

  private clearFailedAttempts(crewcode: string): void {
    loginAttempts.delete(crewcode);
  }

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const delay = this.getLoginDelay(loginDto.crewcode);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const user = await this.usersService.findByCrewcode(loginDto.crewcode);

    if (!user) {
      this.recordFailedAttempt(loginDto.crewcode);
      throw new UnauthorizedException("Invalid crewcode or password");
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      this.recordFailedAttempt(loginDto.crewcode);
      throw new UnauthorizedException("Invalid crewcode or password");
    }

    this.clearFailedAttempts(loginDto.crewcode);

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    if (loginDto.language) {
      await this.usersService.updateLanguage(user.id, loginDto.language);
      user.language = loginDto.language;
    }

    const tokens = await this.generateTokens(user, ipAddress, userAgent);

    return {
      ...tokens,
      user: user.serialize(user.role),
    };
  }

  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const tokenHash = this.hashToken(refreshToken);
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: tokenHash },
      relations: ["user"],
    });

    if (!tokenEntity || !tokenEntity.isValid()) {
      if (tokenEntity && tokenEntity.isRevoked) {
        this.logger.warn(`Refresh token replay detected for user ${tokenEntity.userId}. Revoking all sessions.`);
        await this.refreshTokenRepository.update(
          { userId: tokenEntity.userId, isRevoked: false },
          { isRevoked: true },
        );
      }
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    tokenEntity.isRevoked = true;
    await this.refreshTokenRepository.save(tokenEntity);

    const tokens = await this.generateTokens(
      tokenEntity.user,
      ipAddress,
      userAgent,
    );

    return {
      ...tokens,
      user: tokenEntity.user.serialize(tokenEntity.user.role),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: tokenHash },
    });

    if (tokenEntity) {
      tokenEntity.isRevoked = true;
      await this.refreshTokenRepository.save(tokenEntity);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto | ForceChangePasswordDto,
    isForced: boolean = false,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (!isForced && "currentPassword" in changePasswordDto) {
      const isCurrentPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException("Current password is incorrect");
      }
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.usersService.updatePassword(userId, hashedPassword);
    await this.usersService.updateMustChangePassword(userId, false);

    await this.logoutAllDevices(userId);
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return user.serialize(user.role);
  }

  private async generateTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const basePayload: TokenPayloadDto = {
      sub: user.id,
      crewcode: user.crewcode,
      role: user.role,
      ruolo: user.ruolo,
    };

    const secret = this.configService.get<string>("JWT_SECRET");

    const accessToken = this.jwtService.sign(
      { ...basePayload, type: "access" },
      { secret, expiresIn: "15m" },
    );

    const refreshSecret =
      this.configService.get<string>("JWT_REFRESH_SECRET") || secret;
    const refreshToken = this.jwtService.sign(
      { ...basePayload, type: "refresh" },
      { secret: refreshSecret, expiresIn: "30d" },
    );

    const refreshExpirationDays = parseInt(
      this.configService
        .get<string>("JWT_REFRESH_EXPIRATION", "30d")
        .replace("d", ""),
      10,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpirationDays);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      token: this.hashToken(refreshToken),
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    const accessExpirationMinutes = parseInt(
      this.configService
        .get<string>("JWT_ACCESS_EXPIRATION", "15m")
        .replace("m", ""),
      10,
    );
    const expiresIn = accessExpirationMinutes * 60;

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }
}
