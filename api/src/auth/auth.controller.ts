import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Headers,
  Ip,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import {
  ChangePasswordDto,
  ForceChangePasswordDto,
} from "./dto/change-password.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { User } from "../users/entities/user.entity";

interface RequestWithUser extends Request {
  user: {
    userId: string;
    crewcode: string;
    role: string;
    ruolo: string | null;
  };
}

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, ip, userAgent);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Ip() ip: string,
    @Headers("user-agent") userAgent: string,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
      ip,
      userAgent,
    );
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(refreshTokenDto.refreshToken);
    return { message: "Logged out successfully" };
  }

  @Post("logout-all")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAllDevices(
    @Request() req: RequestWithUser,
  ): Promise<{ message: string }> {
    await this.authService.logoutAllDevices(req.user.userId);
    return { message: "Logged out from all devices successfully" };
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      req.user.userId,
      changePasswordDto,
      false,
    );
    return { message: "Password changed successfully" };
  }

  @Post("force-change-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async forceChangePassword(
    @Request() req: RequestWithUser,
    @Body() forceChangePasswordDto: ForceChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      req.user.userId,
      forceChangePasswordDto,
      true,
    );
    return { message: "Password changed successfully" };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: RequestWithUser): Promise<Partial<User>> {
    return this.authService.getProfile(req.user.userId);
  }
}
