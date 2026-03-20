import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from "@nestjs/common";
import { ClaContractsService } from "./cla-contracts.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

/**
 * Public CLA Contracts Controller
 * Read-only access for authenticated users
 * Used by payslip calculator
 */
@Controller("cla-contracts")
@UseGuards(JwtAuthGuard)
export class ClaContractsPublicController {
  constructor(private readonly claContractsService: ClaContractsService) {}

  @Get()
  async findByRank(
    @Query("company") company: string,
    @Query("role") role: string,
    @Query("rank") rank: string,
    @Query("year", new ParseIntPipe({ optional: true })) year?: number,
    @Query("month", new ParseIntPipe({ optional: true })) month?: number,
  ) {
    // Validate required params
    if (!company || !role || !rank) {
      return null;
    }

    // Build date from year/month or use current date
    let date: Date | undefined;
    if (year && month) {
      date = new Date(year, month - 1, 1); // month is 0-indexed in JS
    } else if (year) {
      date = new Date(year, 0, 1);
    }

    return this.claContractsService.findByRank(company, role, rank, date);
  }
}
