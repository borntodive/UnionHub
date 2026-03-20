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
import { BasesService } from "./bases.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { CreateBaseDto } from "./dto/create-base.dto";
import { UpdateBaseDto } from "./dto/update-base.dto";

@Controller("bases")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BasesController {
  constructor(private readonly basesService: BasesService) {}

  @Get()
  async findAll() {
    return this.basesService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.basesService.findById(id);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN)
  async create(@Body() createBaseDto: CreateBaseDto) {
    return this.basesService.create(createBaseDto);
  }

  @Put(":id")
  @Roles(UserRole.SUPERADMIN)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateBaseDto: UpdateBaseDto,
  ) {
    return this.basesService.update(id, updateBaseDto);
  }

  @Delete(":id")
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.basesService.remove(id);
  }
}
