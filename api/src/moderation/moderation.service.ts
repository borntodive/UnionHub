import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { io, Socket } from "socket.io-client";
import { AiService } from "../ai/ai.service";
import { User } from "../users/entities/user.entity";
import { ChatMessage } from "../chat/entities/chat-message.entity";
import { MODERATION_SYSTEM_PROMPT } from "./prompts/moderation.prompt";

const TOKEN_REFRESH_INTERVAL_MS = 14 * 60 * 1000;

@Injectable()
export class ModerationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ModerationService.name);
  private socket: Socket | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  botUserId: string | null = null;

  constructor(
    private readonly aiService: AiService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.connect();
      this.refreshInterval = setInterval(async () => {
        this.socket?.disconnect();
        await this.connect();
      }, TOKEN_REFRESH_INTERVAL_MS);
    } catch (err) {
      this.logger.error("ModerationService failed to initialize", err);
    }
  }

  onModuleDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.socket?.disconnect();
  }

  private async connect(): Promise<void> {
    const botUser = await this.usersRepo.findOne({
      where: { crewcode: "BOT_MOD", isBot: true },
    });
    if (!botUser) {
      this.logger.warn("BOT_MOD user not found in DB — moderation disabled");
      return;
    }

    this.botUserId = botUser.id;
    const secret = this.configService.get<string>("JWT_SECRET");
    const token = this.jwtService.sign(
      { sub: botUser.id, crewcode: botUser.crewcode, role: botUser.role },
      { secret, expiresIn: "15m" },
    );

    const port = this.configService.get<number>("PORT") ?? 3000;
    this.socket = io(`http://localhost:${port}/chat`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });

    this.socket.on("connect", () =>
      this.logger.log("ModerationService connected to chat gateway"),
    );
    this.socket.on("disconnect", () =>
      this.logger.warn("ModerationService disconnected from chat gateway"),
    );
    this.socket.on("new_message", (msg: ChatMessage) => {
      this.handleNewMessage(msg).catch(() => {});
    });
  }

  private async handleNewMessage(msg: ChatMessage): Promise<void> {
    const reason = await this.classifyMessage(msg);
    if (!reason) return;

    const warning = `⚠️ Attenzione: questo messaggio potrebbe non rispettare le linee guida della chat sindacale. [${reason}]`;
    this.socket?.emit("send_message", {
      roomId: msg.roomId,
      content: warning,
    });
  }

  async classifyMessage(msg: ChatMessage): Promise<string | null> {
    if (msg.sender?.id === this.botUserId) return null;
    const content = msg.content;
    if (!content || !content.trim()) return null;

    try {
      const response = await this.aiService.generate(
        content,
        MODERATION_SYSTEM_PROMPT,
        undefined,
      );
      const trimmed = response.trim();
      if (trimmed.startsWith("FLAG:")) {
        return trimmed.slice("FLAG:".length).trim();
      }
      return null;
    } catch (err) {
      this.logger.error("classifyMessage AI call failed", err);
      return null;
    }
  }
}
