import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
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
      client.emit("error", { code: "SAVE_FAILED", message: err.message });
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
      client.emit("error", { code: "DELETE_FAILED", message: err.message });
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
      client.emit("error", { code: "PIN_FAILED", message: err.message });
    }
  }

  private async getOnlineUserIds(roomId: string): Promise<string[]> {
    const sockets = await this.server.in(roomId).fetchSockets();
    return sockets.map((s) => s.data.userId).filter(Boolean);
  }
}
