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
import { VolmetService } from "./volmet.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { CreateVolmetDto } from "./dto/create-volmet.dto";
import { UpdateVolmetDto } from "./dto/update-volmet.dto";

@Controller("volmet")
export class VolmetController {
  constructor(private readonly volmetService: VolmetService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query("activeOnly") activeOnly?: string) {
    return this.volmetService.findAll(activeOnly === "true");
  }

  @Get("regions")
  @UseGuards(JwtAuthGuard)
  async getRegions() {
    return this.volmetService.getRegions();
  }

  @Get("search/:query")
  @UseGuards(JwtAuthGuard)
  async search(@Param("query") query: string) {
    return this.volmetService.search(query);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.volmetService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async create(@Body() createVolmetDto: CreateVolmetDto) {
    return this.volmetService.create(createVolmetDto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateVolmetDto: UpdateVolmetDto,
  ) {
    return this.volmetService.update(id, updateVolmetDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.volmetService.remove(id);
  }
}
