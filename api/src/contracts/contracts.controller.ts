import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ContractsService } from "./contracts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";

interface RequestWithUser extends Request {
  user: {
    userId: string;
    crewcode: string;
    role: UserRole;
    ruolo: Ruolo | null;
  };
}

@Controller("contracts")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  async findAll(@Request() req: RequestWithUser) {
    const contracts = await this.contractsService.findAll();

    // If superadmin, return all contracts
    if (req.user.role === UserRole.SUPERADMIN) {
      return contracts;
    }

    // If admin, filter by their ruolo
    if (req.user.role === UserRole.ADMIN) {
      if (req.user.ruolo === Ruolo.PILOT) {
        return contracts.filter(
          (c) =>
            c.codice.includes("PI") ||
            ["AFA", "Contractor", "DAC"].includes(c.codice),
        );
      }
      if (req.user.ruolo === Ruolo.CABIN_CREW) {
        return contracts.filter(
          (c) => c.codice.includes("CC") || c.codice === "CrewLink",
        );
      }
    }

    // For regular users, return all (they shouldn't have access anyway)
    return contracts;
  }

  @Get(":id")
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.contractsService.findById(id);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN)
  async create(@Body() createContractDto: CreateContractDto) {
    return this.contractsService.create(createContractDto);
  }

  @Put(":id")
  @Roles(UserRole.SUPERADMIN)
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateContractDto: UpdateContractDto,
  ) {
    return this.contractsService.update(id, updateContractDto);
  }

  @Delete(":id")
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    await this.contractsService.remove(id);
  }
}
