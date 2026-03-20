import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
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

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findByCrewcode(loginDto.crewcode);

    if (!user) {
      throw new UnauthorizedException("Invalid crewcode or password");
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid crewcode or password");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
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
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ["user"],
    });

    if (!tokenEntity || !tokenEntity.isValid()) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Revoke old token
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
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
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

    // If not forced change, verify current password
    if (!isForced && "currentPassword" in changePasswordDto) {
      const isCurrentPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException("Current password is incorrect");
      }
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password and reset mustChangePassword flag
    await this.usersService.updatePassword(userId, hashedPassword);
    await this.usersService.updateMustChangePassword(userId, false);

    // Revoke all refresh tokens for security
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

    const refreshToken = this.jwtService.sign(
      { ...basePayload, type: "refresh" },
      { secret, expiresIn: "30d" },
    );

    // Calculate expiration date for refresh token
    const refreshExpirationDays = parseInt(
      this.configService
        .get<string>("JWT_REFRESH_EXPIRATION", "30d")
        .replace("d", ""),
      10,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpirationDays);

    // Save refresh token to database
    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshToken,
      expiresAt,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    // Calculate expiresIn for access token (in seconds)
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
