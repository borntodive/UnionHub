import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";
import { GmailService } from "./gmail.service";

@Controller("gmail")
@UseGuards(JwtAuthGuard)
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  // ── RSA endpoints ──────────────────────────────────────────────

  @Get("inbox")
  listEmails(
    @Req() req: any,
    @Query("pageToken") pageToken?: string,
    @Query("ruolo") ruolo?: string,
  ) {
    return this.gmailService.listEmails(
      req.user.id,
      pageToken,
      ruolo ? this.parseRuoloOptional(ruolo) : undefined,
    );
  }

  @Get("inbox/:id")
  getEmail(
    @Req() req: any,
    @Param("id") id: string,
    @Query("ruolo") ruolo?: string,
  ) {
    return this.gmailService.getEmail(
      req.user.id,
      id,
      ruolo ? this.parseRuoloOptional(ruolo) : undefined,
    );
  }

  @Get("inbox/:id/attachment")
  getAttachment(
    @Req() req: any,
    @Param("id") messageId: string,
    @Query("attachmentId") attachmentId: string,
    @Query("ruolo") ruolo?: string,
  ) {
    return this.gmailService.getAttachment(
      req.user.id,
      messageId,
      attachmentId,
      ruolo ? this.parseRuoloOptional(ruolo) : undefined,
    );
  }

  // ── SuperAdmin setup endpoints ─────────────────────────────────

  /**
   * GET /gmail/authorize?ruolo=pilot|cabin_crew
   * Returns the OAuth2 authorization URL for the given role's Gmail account.
   */
  @Get("authorize")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  getAuthorizationUrl(@Query("ruolo") ruolo: string) {
    const parsed = this.parseRuolo(ruolo);
    return {
      url: this.gmailService.getAuthorizationUrl(parsed),
      ruolo: parsed,
    };
  }

  /**
   * POST /gmail/authorize
   * Body: { code: string, ruolo: "pilot" | "cabin_crew" }
   * Exchanges the authorization code for a refresh token.
   * Save the returned refreshToken in GOOGLE_REFRESH_TOKEN_PILOT or GOOGLE_REFRESH_TOKEN_CABIN_CREW.
   */
  @Post("authorize")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  async authorize(@Body("code") code: string, @Body("ruolo") ruolo: string) {
    const parsed = this.parseRuolo(ruolo);
    const result = await this.gmailService.exchangeCode(code, parsed);
    const envKey =
      parsed === Ruolo.PILOT
        ? "GOOGLE_REFRESH_TOKEN_PILOT"
        : "GOOGLE_REFRESH_TOKEN_CABIN_CREW";
    return {
      message: `Authorization successful. Save this refresh token in ${envKey} env var.`,
      refreshToken: result.refreshToken,
      ruolo: parsed,
    };
  }

  /**
   * GET /gmail/status
   * Returns authorization status for both roles.
   */
  @Get("status")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  getStatus() {
    return {
      pilot: this.gmailService.isAuthorized(Ruolo.PILOT),
      cabin_crew: this.gmailService.isAuthorized(Ruolo.CABIN_CREW),
    };
  }

  // ── Private helpers ────────────────────────────────────────────

  private parseRuolo(value: string): Ruolo {
    if (value === Ruolo.PILOT || value === Ruolo.CABIN_CREW) {
      return value as Ruolo;
    }
    throw new BadRequestException(
      `Invalid ruolo. Must be "${Ruolo.PILOT}" or "${Ruolo.CABIN_CREW}"`,
    );
  }

  private parseRuoloOptional(value: string): Ruolo | undefined {
    if (value === Ruolo.PILOT || value === Ruolo.CABIN_CREW) {
      return value as Ruolo;
    }
    return undefined;
  }
}
