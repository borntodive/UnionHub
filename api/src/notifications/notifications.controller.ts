import { Controller, Post, Body, Request, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

interface RequestWithUser extends Request {
  user: {
    userId: string;
    crewcode: string;
    role: string;
  };
}

interface RegisterTokenDto {
  token: string;
  platform?: string;
}

@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("register-token")
  async registerToken(
    @Request() req: RequestWithUser,
    @Body() dto: RegisterTokenDto,
  ) {
    await this.notificationsService.registerToken(
      req.user.userId,
      dto.token,
      dto.platform || "expo",
    );
    return { message: "Token registered successfully" };
  }

  @Post("unregister-token")
  async unregisterToken(
    @Request() req: RequestWithUser,
    @Body() dto: { token: string },
  ) {
    await this.notificationsService.unregisterToken(dto.token, req.user.userId);
    return { message: "Token unregistered successfully" };
  }
}
