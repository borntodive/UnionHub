import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ChatService } from "./chat.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { User } from "../users/entities/user.entity";
import { UserRole } from "../common/enums/user-role.enum";

@WebSocketGateway({
  cors: { origin: "*", credentials: true },
  namespace: "/chat",
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>("JWT_SECRET");
      const payload = this.jwtService.verify(token, { secret });

      if (payload.type && payload.type !== "access") {
        client.disconnect();
        return;
      }

      const user = await this.usersRepo.findOne({
        where: { id: payload.sub, isActive: true },
        relations: ["base"],
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.data.userId = user.id;
      client.data.user = user;

      const rooms = await this.chatService.getRoomsForUser(user.id);
      for (const room of rooms) {
        await client.join(room.id);
      }
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(_client: Socket): void {
    // Socket.io cleans up rooms automatically
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ): Promise<void> {
    const user: User = client.data.user;
    if (!user) {
      client.disconnect();
      return;
    }

    if (
      !this.chatService.canAccessRoom(
        { role: user.role, ruolo: user.ruolo, baseId: user.base?.id },
        dto.roomId,
      )
    ) {
      client.emit("error", {
        code: "FORBIDDEN",
        message: "Access denied to this room",
      });
      return;
    }

    try {
      const message = await this.chatService.saveMessage(user, dto);
      this.server.to(dto.roomId).emit("new_message", message);

      const onlineUserIds = await this.getOnlineUserIds(dto.roomId);
      this.chatService
        .pushToOfflineUsers(dto.roomId, message, onlineUserIds)
        .catch(() => {});
    } catch (err: any) {
      this.logger.error("send_message failed", err);
      client.emit("error", {
        code: "SAVE_FAILED",
        message: "Failed to send message",
      });
    }
  }

  @SubscribeMessage("delete_message")
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; roomId: string },
  ): Promise<void> {
    const user: User = client.data.user;
    if (
      !user ||
      (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN)
    ) {
      client.emit("error", { code: "FORBIDDEN", message: "Admin only" });
      return;
    }
    try {
      await this.chatService.softDelete(data.messageId, user);
      this.server.to(data.roomId).emit("message_deleted", {
        messageId: data.messageId,
        roomId: data.roomId,
      });
    } catch (err: any) {
      this.logger.error("delete_message failed", err);
      client.emit("error", {
        code: "DELETE_FAILED",
        message: "Failed to delete message",
      });
    }
  }

  @SubscribeMessage("pin_message")
  async handlePinMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; pin: boolean },
  ): Promise<void> {
    const user: User = client.data.user;
    if (
      !user ||
      (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERADMIN)
    ) {
      client.emit("error", { code: "FORBIDDEN", message: "Admin only" });
      return;
    }
    try {
      const updated = await this.chatService.togglePin(data.messageId, user);
      this.server.to(updated.roomId).emit("message_pinned", {
        messageId: updated.id,
        roomId: updated.roomId,
        isPinned: updated.isPinned,
      });
    } catch (err: any) {
      this.logger.error("pin_message failed", err);
      client.emit("error", {
        code: "PIN_FAILED",
        message: "Failed to pin message",
      });
    }
  }

  @SubscribeMessage("typing_start")
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): void {
    const user: User = client.data.user;
    if (
      !user ||
      !this.chatService.canAccessRoom(
        { role: user.role, ruolo: user.ruolo, baseId: user.base?.id },
        data.roomId,
      )
    ) {
      return;
    }
    client.to(data.roomId).emit("user_typing", {
      userId: user.id,
      nome: user.nome,
      cognome: user.cognome,
    });
  }

  @SubscribeMessage("typing_stop")
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ): void {
    const user: User = client.data.user;
    if (!user) return;
    client.to(data.roomId).emit("user_stopped_typing", { userId: user.id });
  }

  @SubscribeMessage("add_reaction")
  async handleAddReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; roomId: string; emoji: string },
  ): Promise<void> {
    const user: User = client.data.user;
    if (!user) return;
    try {
      const reactions = await this.chatService.toggleReaction(
        data.messageId,
        user.id,
        data.emoji,
      );
      this.server
        .to(data.roomId)
        .emit("reaction_updated", { messageId: data.messageId, reactions });
    } catch (err: any) {
      this.logger.error("add_reaction failed", err);
      client.emit("error", { code: "REACTION_FAILED", message: err.message });
    }
  }

  @SubscribeMessage("remove_reaction")
  async handleRemoveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; roomId: string; emoji: string },
  ): Promise<void> {
    const user: User = client.data.user;
    if (!user) return;
    try {
      const reactions = await this.chatService.toggleReaction(
        data.messageId,
        user.id,
        data.emoji,
      );
      this.server
        .to(data.roomId)
        .emit("reaction_updated", { messageId: data.messageId, reactions });
    } catch (err: any) {
      this.logger.error("remove_reaction failed", err);
      client.emit("error", { code: "REACTION_FAILED", message: err.message });
    }
  }

  async getOnlineCount(roomId: string): Promise<number> {
    const sockets = await this.server.in(roomId).fetchSockets();
    return sockets.length;
  }

  private async getOnlineUserIds(roomId: string): Promise<string[]> {
    const sockets = await this.server.in(roomId).fetchSockets();
    return sockets.map((s) => s.data.userId).filter(Boolean);
  }
}
