import { Controller, Post, Body, Request, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";

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

  @Post("broadcast-ota")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async broadcastOta() {
    await this.notificationsService.broadcastOtaNotification();
    return { message: "OTA notification sent" };
  }
}
