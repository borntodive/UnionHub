import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as path from "path";
import * as fs from "fs";
import { ChatMessage } from "./entities/chat-message.entity";
import { ChatAttachment } from "./entities/chat-attachment.entity";
import { SendMessageDto } from "./dto/send-message.dto";
import { GetMessagesDto } from "./dto/get-messages.dto";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";
import { User } from "../users/entities/user.entity";
import { Base } from "../bases/entities/base.entity";
import { NotificationsService } from "../notifications/notifications.service";

// Flip to true to roll out chat notifications to all users
const CHAT_FOR_ALL_USERS = false;

export interface ChatRoom {
  id: string;
  name: string;
}

@Injectable()
export class ChatService {
  private readonly uploadsDir: string;

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatAttachment)
    private readonly attachmentRepo: Repository<ChatAttachment>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Base)
    private readonly basesRepo: Repository<Base>,
    private readonly notificationsService: NotificationsService,
  ) {
    this.uploadsDir =
      process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");
  }

  // ─── Room access ────────────────────────────────────────────────────────────

  async getRoomsForUser(userId: string): Promise<ChatRoom[]> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ["base"],
    });
    if (!user || !user.isActive) return [];

    const bases = await this.basesRepo.find();

    if (user.role === UserRole.SUPERADMIN) {
      return [
        ...this.buildRoomsForRuolo(Ruolo.PILOT, bases),
        ...this.buildRoomsForRuolo(Ruolo.CABIN_CREW, bases),
      ];
    }

    if (!user.ruolo) return [];

    if (user.role === UserRole.ADMIN) {
      return this.buildRoomsForRuolo(user.ruolo, bases);
    }

    // Regular user: generale + own base room
    const ruoloLabel = user.ruolo === Ruolo.PILOT ? "Piloti" : "Cabin Crew";
    const prefix = user.ruolo;
    const rooms: ChatRoom[] = [
      { id: `${prefix}-generale`, name: `${ruoloLabel} - Generale` },
    ];
    if (user.base) {
      rooms.push({
        id: `${prefix}-${user.base.id}`,
        name: `${ruoloLabel} - ${user.base.nome}`,
      });
    }
    return rooms;
  }

  private buildRoomsForRuolo(ruolo: Ruolo, bases: Base[]): ChatRoom[] {
    const label = ruolo === Ruolo.PILOT ? "Piloti" : "Cabin Crew";
    return [
      { id: `${ruolo}-generale`, name: `${label} - Generale` },
      ...bases.map((b) => ({
        id: `${ruolo}-${b.id}`,
        name: `${label} - ${b.nome}`,
      })),
    ];
  }

  canAccessRoom(
    user: { role: UserRole; ruolo?: Ruolo | null; baseId?: string | null },
    roomId: string,
  ): boolean {
    if (user.role === UserRole.SUPERADMIN) return true;
    if (!user.ruolo) return false;

    const prefix = user.ruolo as string;
    if (!roomId.startsWith(`${prefix}-`)) return false;

    const suffix = roomId.slice(prefix.length + 1);

    if (user.role === UserRole.ADMIN) return true;

    if (suffix === "generale") return true;
    if (user.baseId && suffix === user.baseId) return true;
    return false;
  }

  // ─── Messages ───────────────────────────────────────────────────────────────

  async getHistory(
    userId: string,
    roomId: string,
    dto: GetMessagesDto,
  ): Promise<ChatMessage[]> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ["base"],
    });
    if (!user) throw new ForbiddenException();

    if (
      !this.canAccessRoom(
        { role: user.role, ruolo: user.ruolo, baseId: user.base?.id },
        roomId,
      )
    ) {
      throw new ForbiddenException("Access denied to this room");
    }

    const limit = Math.min(parseInt(dto.limit ?? "50", 10), 100);
    const qb = this.messageRepo
      .createQueryBuilder("m")
      .leftJoinAndSelect("m.sender", "sender")
      .leftJoinAndSelect("m.attachments", "attachments")
      .where("m.roomId = :roomId", { roomId })
      .andWhere("m.deletedAt IS NULL")
      .orderBy("m.createdAt", "DESC")
      .take(limit);

    if (dto.before) {
      qb.andWhere("m.createdAt < :before", { before: new Date(dto.before) });
    }

    const messages = await qb.getMany();
    return messages.reverse();
  }

  async saveMessage(user: User, dto: SendMessageDto): Promise<ChatMessage> {
    if (
      !dto.content &&
      (!dto.attachmentIds || dto.attachmentIds.length === 0)
    ) {
      throw new BadRequestException("Message must have content or attachments");
    }

    if (!this.canAccessRoom(user, dto.roomId)) {
      throw new ForbiddenException("Access denied");
    }

    const message = this.messageRepo.create({
      roomId: dto.roomId,
      senderId: user.id,
      content: dto.content ?? null,
    });
    const saved = await this.messageRepo.save(message);

    if (dto.attachmentIds && dto.attachmentIds.length > 0) {
      for (const attachmentId of dto.attachmentIds) {
        await this.attachmentRepo.update(
          { id: attachmentId },
          { messageId: saved.id },
        );
      }
    }

    return this.messageRepo.findOne({
      where: { id: saved.id },
      relations: ["sender", "attachments"],
    }) as Promise<ChatMessage>;
  }

  async softDelete(
    messageId: string,
    requestingUser: { role: UserRole; ruolo?: Ruolo | null },
  ): Promise<void> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException("Message not found");

    if (requestingUser.role === UserRole.ADMIN && requestingUser.ruolo) {
      const prefix = requestingUser.ruolo as string;
      if (!message.roomId.startsWith(`${prefix}-`)) {
        throw new ForbiddenException("Access denied");
      }
    }

    await this.messageRepo.softDelete(messageId);
  }

  async togglePin(
    messageId: string,
    requestingUser: { role: UserRole; ruolo?: Ruolo | null },
  ): Promise<ChatMessage> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) throw new NotFoundException("Message not found");

    if (requestingUser.role === UserRole.ADMIN && requestingUser.ruolo) {
      const prefix = requestingUser.ruolo as string;
      if (!message.roomId.startsWith(`${prefix}-`)) {
        throw new ForbiddenException("Access denied");
      }
    }

    message.isPinned = !message.isPinned;
    return this.messageRepo.save(message);
  }

  // ─── Attachments ────────────────────────────────────────────────────────────

  async saveAttachmentRecord(data: {
    originalName: string;
    filename: string;
    mimeType: string;
    size: number;
  }): Promise<ChatAttachment> {
    const att = this.attachmentRepo.create({ ...data, messageId: null });
    return this.attachmentRepo.save(att);
  }

  async getAttachment(
    id: string,
    requestingUser: {
      role: UserRole;
      ruolo?: Ruolo | null;
      baseId?: string | null;
    },
  ): Promise<{ attachment: ChatAttachment; filePath: string }> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id },
      relations: ["message"],
    });
    if (!attachment) throw new NotFoundException("Attachment not found");

    // If the attachment is linked to a message, verify room access
    if (
      attachment.message &&
      !this.canAccessRoom(requestingUser, attachment.message.roomId)
    ) {
      throw new ForbiddenException("Access denied");
    }

    const filePath = path.join(this.uploadsDir, "chat", attachment.filename);
    if (!fs.existsSync(filePath)) throw new NotFoundException("File not found");
    return { attachment, filePath };
  }

  // ─── Push notifications ──────────────────────────────────────────────────────

  async pushToOfflineUsers(
    roomId: string,
    message: ChatMessage,
    onlineUserIds: string[],
  ): Promise<void> {
    const roomUsers = await this.getUsersInRoom(roomId);
    const offlineUsers = roomUsers.filter(
      (u) =>
        !onlineUserIds.includes(u.id) &&
        (CHAT_FOR_ALL_USERS ||
          u.role === UserRole.ADMIN ||
          u.role === UserRole.SUPERADMIN),
    );
    const senderName = `${message.sender.nome} ${message.sender.cognome}`;
    const preview = message.content?.slice(0, 60) ?? "📎 allegato";

    for (const user of offlineUsers) {
      this.notificationsService
        .sendPushNotification(user.id, `💬 ${senderName}`, preview, {
          type: "NEW_CHAT_MESSAGE",
          roomId,
        })
        .catch(() => {});
    }
  }

  private async getUsersInRoom(roomId: string): Promise<User[]> {
    // Room IDs: "pilot-generale", "cabin_crew-generale", "pilot-<baseId>", "cabin_crew-<baseId>"
    // Ruolo values: "pilot", "cabin_crew"
    let ruolo: Ruolo;
    let suffix: string;

    if (roomId.startsWith("cabin_crew-")) {
      ruolo = Ruolo.CABIN_CREW;
      suffix = roomId.slice("cabin_crew-".length);
    } else if (roomId.startsWith("pilot-")) {
      ruolo = Ruolo.PILOT;
      suffix = roomId.slice("pilot-".length);
    } else {
      return [];
    }

    const qb = this.usersRepo
      .createQueryBuilder("u")
      .where("u.isActive = true");

    if (suffix === "generale") {
      qb.andWhere("(u.ruolo = :ruolo OR u.role = :superadmin)", {
        ruolo,
        superadmin: UserRole.SUPERADMIN,
      });
    } else {
      qb.andWhere(
        "(u.role = :superadmin OR (u.ruolo = :ruolo AND u.role = :admin) OR (u.ruolo = :ruolo AND u.baseId = :baseId))",
        {
          superadmin: UserRole.SUPERADMIN,
          ruolo,
          admin: UserRole.ADMIN,
          baseId: suffix,
        },
      );
    }

    return qb.getMany();
  }
}
