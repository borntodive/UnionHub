import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { Response } from "express";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { ChatService } from "./chat.service";
import { GetMessagesDto } from "./dto/get-messages.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";

const uploadsDir =
  process.env.UPLOAD_BASE_DIR || path.join(process.cwd(), "uploads");

@Controller("chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("rooms")
  async getRooms(@Req() req: any) {
    return this.chatService.getRoomsForUser(req.user.userId);
  }

  @Get("rooms/:roomId/messages")
  async getMessages(
    @Req() req: any,
    @Param("roomId") roomId: string,
    @Query() dto: GetMessagesDto,
  ) {
    return this.chatService.getHistory(req.user.userId, roomId, dto);
  }

  @Post("rooms/:roomId/attachments")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const dir = path.join(uploadsDir, "chat");
          fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req: any, file: any, cb: any) => {
          const ext = path.extname(file.originalname);
          const name = `${crypto.randomUUID()}${ext}`;
          cb(null, name);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
    }),
  )
  async uploadAttachment(
    @Req() req: any,
    @Param("roomId") roomId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("No file provided");

    const rooms = await this.chatService.getRoomsForUser(req.user.userId);
    if (!rooms.find((r) => r.id === roomId)) {
      fs.unlinkSync(file.path);
      throw new ForbiddenException("Access denied to this room");
    }

    const attachment = await this.chatService.saveAttachmentRecord({
      originalName: file.originalname,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
    });

    return { attachmentId: attachment.id };
  }

  @Delete("messages/:id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    await this.chatService.softDelete(id, req.user);
  }

  @Patch("messages/:id/pin")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async pinMessage(@Req() req: any, @Param("id", ParseUUIDPipe) id: string) {
    return this.chatService.togglePin(id, req.user);
  }

  @Get("attachments/:id")
  async downloadAttachment(
    @Req() req: any,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { attachment, filePath } = await this.chatService.getAttachment(
      id,
      req.user,
    );
    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
    );
    res.sendFile(path.resolve(filePath));
  }
}
