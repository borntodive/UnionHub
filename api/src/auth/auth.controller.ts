import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Param,
  Headers,
  Ip,
  NotFoundException,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { BasesService } from "../bases/bases.service";
import { GradesService } from "../grades/grades.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import {
  ChangePasswordDto,
  ForceChangePasswordDto,
} from "./dto/change-password.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { PublicRegisterDto } from "../users/dto/public-register.dto";
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
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private basesService: BasesService,
    private gradesService: GradesService,
  ) {}

  /** Step 3→4: generate PDF, save to temp dir, return tempId for preview. */
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post("register/prepare")
  @HttpCode(HttpStatus.OK)
  async prepareRegistration(
    @Body() dto: PublicRegisterDto,
  ): Promise<{ tempId: string }> {
    return this.usersService.prepareRegistration(dto);
  }

  /** Serve the temp PDF as base64 so the wizard can show a preview. */
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Get("register/preview/:tempId")
  async getRegistrationPreview(
    @Param("tempId") tempId: string,
  ): Promise<{ base64: string }> {
    const base64 = await this.usersService.getRegistrationPreview(tempId);
    return { base64 };
  }

  /** Serve the temp PDF as a raw binary file (application/pdf).
   *  Used by the mobile WebView to display the preview inline via HTTP. */
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Get("register/preview-file/:tempId")
  async getRegistrationPreviewFile(
    @Param("tempId") tempId: string,
    @Res() res: Response,
  ): Promise<void> {
    const base64 = await this.usersService.getRegistrationPreview(tempId);
    const buffer = Buffer.from(base64, "base64");
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=modulo_adesione.pdf",
      "Content-Length": buffer.length,
    });
    res.end(buffer);
  }

  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: PublicRegisterDto,
  ): Promise<{ message: string; userId: string }> {
    const user = await this.usersService.registerPublic(dto);
    return {
      message:
        "Registration submitted successfully. You will receive an email once an admin approves your request.",
      userId: user.id,
    };
  }

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
  @UseGuards(JwtAuthGuard)
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

  @Throttle({ default: { ttl: 3600000, limit: 5 } })
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

  /** Public — used by the self-registration wizard to populate dropdowns */
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Get("register/bases")
  async getPublicBases() {
    return this.basesService.findAll();
  }

  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Get("register/grades")
  async getPublicGrades() {
    return this.gradesService.findAll();
  }
}
