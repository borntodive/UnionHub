import {
  Controller,
  ForbiddenException,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CarddavService } from "./carddav.service";
import { UserRole } from "../common/enums/user-role.enum";

interface RequestWithUser extends Request {
  user: { userId: string; crewcode: string; role: UserRole };
}

@Controller("carddav")
export class CarddavController {
  constructor(private readonly carddavService: CarddavService) {}

  @Post("profile-token")
  @UseGuards(JwtAuthGuard)
  getProfileToken(@Request() req: RequestWithUser): { url: string } {
    const { crewcode, role } = req.user;
    if (role === UserRole.USER) {
      throw new ForbiddenException();
    }
    const url = this.carddavService.getProfileUrl(crewcode);
    return { url };
  }
}
