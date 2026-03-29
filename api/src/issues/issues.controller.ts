import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { IssuesService } from "./issues.service";
import { CreateIssueDto } from "./dto/create-issue.dto";
import { UpdateIssueDto } from "./dto/update-issue.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";

@Controller("issues")
@UseGuards(JwtAuthGuard)
export class IssuesController {
  constructor(private readonly service: IssuesService) {}

  @Post()
  create(@Body() dto: CreateIssueDto, @Req() req: any) {
    return this.service.create(dto, req.user.userId, req.user.ruolo);
  }

  @Get("my")
  getMyIssues(@Req() req: any) {
    return this.service.findMyIssues(req.user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  findAll(@Req() req: any) {
    return this.service.findAll(req.user);
  }

  @Post("summary")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async getSummary(@Req() req: any) {
    return this.service.generateSummary(req.user);
  }

  @Get("export")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async exportCsv(@Req() req: any, @Res() res: Response) {
    const csv = await this.service.exportCsv(req.user);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="issues.csv"');
    res.setHeader("Cache-Control", "no-store");
    res.send(csv);
  }

  @Get(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateIssueDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user);
  }

  @Patch(":id/reopen")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  reopen(@Param("id", ParseUUIDPipe) id: string, @Req() req: any) {
    return this.service.reopen(id, req.user);
  }

  @Delete(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.service.remove(id);
  }
}
