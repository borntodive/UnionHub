import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import { ClaContractsService } from "./cla-contracts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { CreateClaContractDto } from "./dto/create-cla-contract.dto";
import { UpdateClaContractDto } from "./dto/update-cla-contract.dto";

interface RequestWithUser extends Request {
  user: {
    userId: string;
    crewcode: string;
    role: UserRole;
  };
}

/**
 * CLA Contracts Controller
 * Manage contractual data for payslip calculations
 * SUPERADMIN only access
 */
@Controller("admin/cla-contracts")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class ClaContractsController {
  constructor(private readonly claContractsService: ClaContractsService) {}

  @Get()
  async findAll(
    @Query("year", new ParseIntPipe({ optional: true })) year?: number,
  ) {
    return this.claContractsService.findAll(year);
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.claContractsService.findById(id);
  }

  @Get(":id/history")
  async getHistory(@Param("id", ParseUUIDPipe) id: string) {
    return this.claContractsService.getHistory(id);
  }

  @Post()
  async create(
    @Body() createDto: CreateClaContractDto,
    @Request() req: RequestWithUser,
  ) {
    return this.claContractsService.create(createDto, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Put(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateClaContractDto,
    @Request() req: RequestWithUser,
  ) {
    return this.claContractsService.update(id, updateDto, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    await this.claContractsService.deactivate(id, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Post(":id/activate")
  async activate(
    @Param("id", ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    return this.claContractsService.activate(id, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Post(":id/clone")
  async cloneForYear(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("year", ParseIntPipe) year: number,
    @Body("isActive") isActive?: boolean,
    @Body("effectiveMonth", new ParseIntPipe({ optional: true }))
    effectiveMonth?: number,
    @Request() req?: RequestWithUser,
  ) {
    return this.claContractsService.cloneForYear(
      id,
      year,
      {
        userId: req!.user.userId,
        crewcode: req!.user.crewcode,
      },
      isActive ?? true,
      effectiveMonth ?? 1,
    );
  }

  @Post(":id/close")
  async close(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("endYear", ParseIntPipe) endYear: number,
    @Body("endMonth", ParseIntPipe) endMonth: number,
    @Request() req: RequestWithUser,
  ) {
    return this.claContractsService.close(id, endYear, endMonth, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }

  @Delete("year/:year")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAllForYear(
    @Param("year", ParseIntPipe) year: number,
    @Request() req: RequestWithUser,
  ) {
    return this.claContractsService.deleteAllForYear(year, {
      userId: req.user.userId,
      crewcode: req.user.crewcode,
    });
  }
}
