import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { IssueCategoriesService } from "./issue-categories.service";
import { CreateIssueCategoryDto } from "./dto/create-issue-category.dto";
import { UpdateIssueCategoryDto } from "./dto/update-issue-category.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";

@Controller("issue-categories")
@UseGuards(JwtAuthGuard, RolesGuard)
export class IssueCategoriesController {
  constructor(private readonly service: IssueCategoriesService) {}

  @Get()
  findAll(@Query("ruolo") ruolo?: Ruolo) {
    return this.service.findAll(ruolo);
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  create(@Body() dto: CreateIssueCategoryDto) {
    return this.service.create(dto);
  }

  @Put(":id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateIssueCategoryDto,
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
