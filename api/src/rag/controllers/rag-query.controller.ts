import { Body, Controller, Post, Request, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { RagQueryService } from "../services/rag-query.service";
import { AskQueryDto } from "../dto/ask-query.dto";
import { SearchQueryDto } from "../dto/search-query.dto";
import { UserRole } from "@common/enums/user-role.enum";
import { Ruolo } from "@common/enums/ruolo.enum";

@Controller("rag")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class RagQueryController {
  constructor(private readonly ragQueryService: RagQueryService) {}

  @Post("ask")
  async ask(@Body() dto: AskQueryDto, @Request() req: Express.Request) {
    const user = req.user as { role: UserRole; ruolo?: Ruolo };
    dto.userRole = user.role;
    dto.userRuolo = user.ruolo;
    return this.ragQueryService.ask(dto);
  }

  @Post("search")
  async search(@Body() dto: SearchQueryDto, @Request() req: Express.Request) {
    const user = req.user as { role: UserRole; ruolo?: Ruolo };
    dto.userRole = user.role;
    dto.userRuolo = user.ruolo;
    return this.ragQueryService.rawSearch(dto);
  }
}
