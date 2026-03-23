import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { User } from "../users/entities/user.entity";
import { Ruolo } from "../common/enums/ruolo.enum";
import { UserRole } from "../common/enums/user-role.enum";

export interface EmailSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
}

export interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailDetail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  bodyHtml: string | null;
  bodyText: string | null;
  attachments: EmailAttachment[];
}

export interface EmailListResult {
  emails: EmailSummary[];
  nextPageToken?: string;
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // ── Per-ruolo config helpers ──────────────────────────────────────

  private getRefreshTokenEnvKey(ruolo: Ruolo): string {
    return ruolo === Ruolo.PILOT
      ? "GOOGLE_REFRESH_TOKEN_PILOT"
      : "GOOGLE_REFRESH_TOKEN_CABIN_CREW";
  }

  private getGmailUserEnvKey(ruolo: Ruolo): string {
    return ruolo === Ruolo.PILOT ? "GMAIL_USER_PILOT" : "GMAIL_USER_CABIN_CREW";
  }

  private getOAuth2ClientForRuolo(ruolo: Ruolo): OAuth2Client {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.configService.get<string>("GOOGLE_CLIENT_SECRET");
    const refreshToken = this.configService.get<string>(
      this.getRefreshTokenEnvKey(ruolo),
    );

    const client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "urn:ietf:wg:oauth:2.0:oob",
    );

    if (refreshToken) {
      client.setCredentials({ refresh_token: refreshToken });
    }

    return client;
  }

  private getGmailClientForRuolo(ruolo: Ruolo): gmail_v1.Gmail {
    const auth = this.getOAuth2ClientForRuolo(ruolo);
    return google.gmail({ version: "v1", auth });
  }

  private getGmailUserForRuolo(ruolo: Ruolo): string {
    return (
      this.configService.get<string>(this.getGmailUserEnvKey(ruolo)) || "me"
    );
  }

  // ── Auth status ────────────────────────────────────────────────────

  isAuthorized(ruolo: Ruolo): boolean {
    const token = this.configService.get<string>(
      this.getRefreshTokenEnvKey(ruolo),
    );
    return !!token;
  }

  getAuthorizationUrl(ruolo: Ruolo): string {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.configService.get<string>("GOOGLE_CLIENT_SECRET");

    const client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "urn:ietf:wg:oauth:2.0:oob",
    );

    return client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.readonly"],
      prompt: "consent",
    });
  }

  async exchangeCode(
    code: string,
    ruolo: Ruolo,
  ): Promise<{ refreshToken: string; ruolo: Ruolo }> {
    const clientId = this.configService.get<string>("GOOGLE_CLIENT_ID");
    const clientSecret = this.configService.get<string>("GOOGLE_CLIENT_SECRET");

    const client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      "urn:ietf:wg:oauth:2.0:oob",
    );

    try {
      const { tokens } = await client.getToken(code);
      if (!tokens.refresh_token) {
        throw new InternalServerErrorException(
          "No refresh token returned. Make sure to revoke previous access and retry.",
        );
      }
      return { refreshToken: tokens.refresh_token, ruolo };
    } catch (err: any) {
      if (err instanceof InternalServerErrorException) throw err;
      throw new InternalServerErrorException(
        `Failed to exchange code: ${err.message}`,
      );
    }
  }

  // ── RSA gate — returns the user's ruolo ────────────────────────────
  // Admin/SuperAdmin bypass the RSA flag and must provide ruoloOverride.
  // Regular users must have rsa=true and a ruolo assigned.

  private async assertRsa(
    userId: string,
    ruoloOverride?: Ruolo,
  ): Promise<Ruolo> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException("User not found");
    }

    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;

    if (isAdmin) {
      if (!ruoloOverride) {
        throw new ForbiddenException(
          "Admin must specify ruolo query param (pilot or cabin_crew)",
        );
      }
      return ruoloOverride;
    }

    if (user.rsa !== true) {
      throw new ForbiddenException("Access restricted to RSA members");
    }
    if (!user.ruolo) {
      throw new ForbiddenException(
        "RSA user has no professional role assigned",
      );
    }
    return user.ruolo;
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private decodeBase64(data: string): string {
    return Buffer.from(
      data.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf-8");
  }

  private extractBody(payload: gmail_v1.Schema$MessagePart): {
    html: string | null;
    text: string | null;
  } {
    let html: string | null = null;
    let text: string | null = null;

    const walk = (part: gmail_v1.Schema$MessagePart) => {
      if (part.mimeType === "text/html" && part.body?.data) {
        html = this.decodeBase64(part.body.data);
      } else if (part.mimeType === "text/plain" && part.body?.data) {
        text = this.decodeBase64(part.body.data);
      }
      if (part.parts) {
        part.parts.forEach(walk);
      }
    };

    walk(payload);
    return { html, text };
  }

  private extractAttachments(
    payload: gmail_v1.Schema$MessagePart,
  ): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    const walk = (part: gmail_v1.Schema$MessagePart) => {
      if (
        part.filename &&
        part.filename.length > 0 &&
        part.body?.attachmentId
      ) {
        attachments.push({
          attachmentId: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType || "application/octet-stream",
          size: part.body.size || 0,
        });
      }
      if (part.parts) {
        part.parts.forEach(walk);
      }
    };

    walk(payload);
    return attachments;
  }

  private getHeader(
    headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
    name: string,
  ): string {
    if (!headers) return "";
    const header = headers.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase(),
    );
    return header?.value || "";
  }

  // ── Public API ─────────────────────────────────────────────────────

  async listEmails(
    userId: string,
    pageToken?: string,
    ruoloOverride?: Ruolo,
  ): Promise<EmailListResult> {
    const ruolo = await this.assertRsa(userId, ruoloOverride);
    const gmailUser = this.getGmailUserForRuolo(ruolo);
    const gmail = this.getGmailClientForRuolo(ruolo);

    try {
      const listRes = await gmail.users.messages.list({
        userId: gmailUser,
        maxResults: 20,
        pageToken: pageToken || undefined,
      });

      const messages = listRes.data.messages || [];
      const nextPageToken = listRes.data.nextPageToken || undefined;

      const emails: EmailSummary[] = await Promise.all(
        messages.map(async (msg) => {
          const detail = await gmail.users.messages.get({
            userId: gmailUser,
            id: msg.id!,
            format: "metadata",
            metadataHeaders: ["From", "Subject", "Date"],
          });

          const headers = detail.data.payload?.headers;
          const unread = (detail.data.labelIds || []).includes("UNREAD");

          return {
            id: detail.data.id!,
            threadId: detail.data.threadId || "",
            from: this.getHeader(headers, "From"),
            subject: this.getHeader(headers, "Subject"),
            date: this.getHeader(headers, "Date"),
            snippet: detail.data.snippet || "",
            unread,
          };
        }),
      );

      return { emails, nextPageToken };
    } catch (err: any) {
      this.logger.error(`Failed to list emails: ${err.message}`);
      throw new InternalServerErrorException("Failed to retrieve emails");
    }
  }

  async getEmail(
    userId: string,
    messageId: string,
    ruoloOverride?: Ruolo,
  ): Promise<EmailDetail> {
    const ruolo = await this.assertRsa(userId, ruoloOverride);
    const gmailUser = this.getGmailUserForRuolo(ruolo);
    const gmail = this.getGmailClientForRuolo(ruolo);

    try {
      const res = await gmail.users.messages.get({
        userId: gmailUser,
        id: messageId,
        format: "full",
      });

      const payload = res.data.payload!;
      const headers = payload.headers;
      const { html, text } = this.extractBody(payload);
      const attachments = this.extractAttachments(payload);

      return {
        id: res.data.id!,
        threadId: res.data.threadId || "",
        from: this.getHeader(headers, "From"),
        subject: this.getHeader(headers, "Subject"),
        date: this.getHeader(headers, "Date"),
        bodyHtml: html,
        bodyText: text,
        attachments,
      };
    } catch (err: any) {
      this.logger.error(`Failed to get email ${messageId}: ${err.message}`);
      throw new InternalServerErrorException("Failed to retrieve email");
    }
  }

  async getAttachment(
    userId: string,
    messageId: string,
    attachmentId: string,
    ruoloOverride?: Ruolo,
  ): Promise<{ data: string; size: number }> {
    const ruolo = await this.assertRsa(userId, ruoloOverride);
    const gmailUser = this.getGmailUserForRuolo(ruolo);
    const gmail = this.getGmailClientForRuolo(ruolo);

    try {
      const res = await gmail.users.messages.attachments.get({
        userId: gmailUser,
        messageId,
        id: attachmentId,
      });

      return {
        data: res.data.data || "",
        size: res.data.size || 0,
      };
    } catch (err: any) {
      this.logger.error(`Failed to get attachment: ${err.message}`);
      throw new InternalServerErrorException("Failed to retrieve attachment");
    }
  }
}
