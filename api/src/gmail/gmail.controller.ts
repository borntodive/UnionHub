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
  Logger,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";
import { GmailService } from "./gmail.service";
import { NotificationsService } from "../notifications/notifications.service";

@Controller("gmail")
@UseGuards(JwtAuthGuard)
export class GmailController {
  constructor(
    private readonly gmailService: GmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

/**
 * Separate controller — no JwtAuthGuard — for Google Pub/Sub push webhook.
 * Google calls POST /gmail/webhook without any Authorization header.
 */
@Controller("gmail")
export class GmailWebhookController {
  private readonly logger = new Logger(GmailWebhookController.name);

  constructor(
    private readonly gmailService: GmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post("webhook")
  @HttpCode(HttpStatus.NO_CONTENT)
  async handleWebhook(@Body() body: any): Promise<void> {
    const messageData = body?.message?.data;
    if (!messageData) return;

    try {
      const decoded = Buffer.from(messageData, "base64").toString("utf-8");
      const { emailAddress, historyId } = JSON.parse(decoded);
      if (!emailAddress || !historyId) return;

      const result = await this.gmailService.processWebhookNotification(
        emailAddress,
        String(historyId),
      );
      if (!result || result.newMessages.length === 0) return;

      const { ruolo, newMessages } = result;
      const count = newMessages.length;
      const title =
        count === 1 ? newMessages[0].subject : `${count} nuove mail sindacali`;
      const body =
        count === 1
          ? newMessages[0].from.replace(/<.*>/, "").trim()
          : newMessages[0].subject;

      await this.notificationsService.notifyRsaUsers(ruolo, title, body, {
        type: "NEW_GMAIL",
        ruolo,
      });
    } catch (err: any) {
      this.logger.error(`Webhook processing error: ${err.message}`);
    }
  }
}
