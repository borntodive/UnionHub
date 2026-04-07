import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { IssueUrgenciesService } from "./issue-urgencies.service";
import { CreateIssueUrgencyDto } from "./dto/create-issue-urgency.dto";
import { UpdateIssueUrgencyDto } from "./dto/update-issue-urgency.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";

@Controller("issue-urgencies")
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssueUrgenciesController {
  constructor(private readonly service: IssueUrgenciesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  create(@Body() dto: CreateIssueUrgencyDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateIssueUrgencyDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.service.remove(id);
  }
}
