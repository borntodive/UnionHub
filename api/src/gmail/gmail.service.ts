import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
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

const PAGE_SIZE = 20;

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private getImapClient(ruolo: Ruolo): ImapFlow {
    const user =
      ruolo === Ruolo.PILOT
        ? this.configService.get<string>("GMAIL_USER_PILOT")!
        : this.configService.get<string>("GMAIL_USER_CABIN_CREW")!;

    const pass =
      ruolo === Ruolo.PILOT
        ? this.configService.get<string>("MAIL_PASS")!
        : this.configService.get<string>("GMAIL_APP_PASSWORD_CABIN_CREW")!;

    return new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user, pass },
      logger: false,
    });
  }

  private getGmailUserForRuolo(ruolo: Ruolo): string {
    return ruolo === Ruolo.PILOT
      ? this.configService.get<string>("GMAIL_USER_PILOT") || ""
      : this.configService.get<string>("GMAIL_USER_CABIN_CREW") || "";
  }

  private async assertRsa(
    userId: string,
    ruoloOverride?: Ruolo,
  ): Promise<Ruolo> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException("User not found");

    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.SUPERADMIN;

    if (isAdmin) {
      if (!ruoloOverride)
        throw new ForbiddenException(
          "Admin must specify ruolo query param (pilot or cabin_crew)",
        );
      return ruoloOverride;
    }

    if (user.rsa !== true)
      throw new ForbiddenException("Access restricted to RSA members");
    if (!user.ruolo)
      throw new ForbiddenException(
        "RSA user has no professional role assigned",
      );
    return user.ruolo;
  }

  async listEmails(
    userId: string,
    pageToken?: string,
    ruoloOverride?: Ruolo,
  ): Promise<EmailListResult> {
    const ruolo = await this.assertRsa(userId, ruoloOverride);
    const client = this.getImapClient(ruolo);
    const page = pageToken ? Math.max(1, parseInt(pageToken, 10)) : 1;

    await client.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const uids = (await client.search({}, { uid: true })) as number[];
        uids.sort((a, b) => b - a);

        const start = (page - 1) * PAGE_SIZE;
        const pageUids = uids.slice(start, start + PAGE_SIZE);
        const hasMore = uids.length > start + PAGE_SIZE;

        const emails: EmailSummary[] = [];
        for (const uid of pageUids) {
          const msg = await client.fetchOne(
            String(uid),
            { envelope: true, flags: true },
            { uid: true },
          );
          if (!msg) continue;

          const envelope = msg.envelope!;
          const f = envelope.from?.[0];
          const from = f
            ? f.name
              ? `${f.name} <${f.address}>`
              : (f.address ?? "")
            : "";

          emails.push({
            id: String(uid),
            threadId: "",
            from,
            subject: envelope.subject || "(no subject)",
            date: envelope.date?.toISOString() ?? "",
            snippet: "",
            unread: !(msg.flags as Set<string>).has("\\Seen"),
          });
        }

        return {
          emails,
          nextPageToken: hasMore ? String(page + 1) : undefined,
        };
      } finally {
        lock.release();
      }
    } catch (err: any) {
      this.logger.error(`listEmails failed: ${err.message}`);
      throw new InternalServerErrorException("Failed to retrieve emails");
    } finally {
      await client.logout();
    }
  }

  async getEmail(
    userId: string,
    messageId: string,
    ruoloOverride?: Ruolo,
  ): Promise<EmailDetail> {
    const ruolo = await this.assertRsa(userId, ruoloOverride);
    const client = this.getImapClient(ruolo);
    const uid = parseInt(messageId, 10);

    await client.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const msg = await client.fetchOne(
          String(uid),
          { source: true },
          { uid: true },
        );
        if (!msg) throw new InternalServerErrorException("Email not found");

        const parsed = await simpleParser(msg.source as Buffer);

        const attachments: EmailAttachment[] = (parsed.attachments ?? []).map(
          (att, idx) => ({
            attachmentId: String(idx),
            filename: att.filename ?? `attachment-${idx}`,
            mimeType: att.contentType ?? "application/octet-stream",
            size: att.size ?? att.content.length,
          }),
        );

        return {
          id: String(uid),
          threadId: "",
          from: parsed.from?.text ?? "",
          subject: parsed.subject ?? "(no subject)",
          date: parsed.date?.toISOString() ?? "",
          bodyHtml: (parsed.html as string) || null,
          bodyText: parsed.text ?? null,
          attachments,
        };
      } finally {
        lock.release();
      }
    } catch (err: any) {
      this.logger.error(`getEmail ${messageId} failed: ${err.message}`);
      throw new InternalServerErrorException("Failed to retrieve email");
    } finally {
      await client.logout();
    }
  }

  async getAttachment(
    userId: string,
    messageId: string,
    attachmentId: string,
    ruoloOverride?: Ruolo,
  ): Promise<{ data: string; size: number }> {
    const ruolo = await this.assertRsa(userId, ruoloOverride);
    const client = this.getImapClient(ruolo);
    const uid = parseInt(messageId, 10);
    const attIdx = parseInt(attachmentId, 10);

    await client.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        const msg = await client.fetchOne(
          String(uid),
          { source: true },
          { uid: true },
        );
        if (!msg) throw new InternalServerErrorException("Email not found");

        const parsed = await simpleParser(msg.source as Buffer);
        const att = parsed.attachments?.[attIdx];
        if (!att)
          throw new InternalServerErrorException("Attachment not found");

        return {
          data: att.content.toString("base64"),
          size: att.content.length,
        };
      } finally {
        lock.release();
      }
    } catch (err: any) {
      this.logger.error(`getAttachment failed: ${err.message}`);
      throw new InternalServerErrorException("Failed to retrieve attachment");
    } finally {
      await client.logout();
    }
  }
}
