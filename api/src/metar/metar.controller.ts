import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { MetarService } from "./metar.service";
import { RunwaysService } from "./runways.service";
import { BulkSyncDto } from "./dto/metar.dto";

@Controller("metar")
export class MetarController {
  constructor(
    private readonly metarService: MetarService,
    private readonly runwaysService: RunwaysService,
  ) {}

  /**
   * Get METAR for an airport.
   * GET /metar/:icao
   */
  @Get(":icao")
  @HttpCode(HttpStatus.OK)
  async getMetar(@Param("icao") icao: string) {
    const result = await this.metarService.getMetar(icao);
    if (!result) {
      return {
        success: false,
        message: "METAR not found for this airport",
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get TAF for an airport.
   * GET /metar/:icao/taf
   */
  @Get(":icao/taf")
  @HttpCode(HttpStatus.OK)
  async getTaf(@Param("icao") icao: string) {
    const result = await this.metarService.getTaf(icao);
    if (!result) {
      return {
        success: false,
        message: "TAF not found for this airport",
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get complete weather info (METAR + TAF + runways + wind components).
   * GET /metar/:icao/weather
   */
  @Get(":icao/weather")
  @HttpCode(HttpStatus.OK)
  async getWeather(@Param("icao") icao: string) {
    const result = await this.metarService.getWeather(icao);
    if (!result) {
      return {
        success: false,
        message: "Weather data not found for this airport",
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get runways for an airport from database.
   * GET /metar/:icao/runways
   */
  @Get(":icao/runways")
  @HttpCode(HttpStatus.OK)
  async getRunways(@Param("icao") icao: string) {
    const result = await this.runwaysService.getRunways(icao);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Sync runways from openAIP API to database.
   * POST /metar/:icao/runways/sync
   */
  @Post(":icao/runways/sync")
  @HttpCode(HttpStatus.OK)
  async syncRunways(@Param("icao") icao: string) {
    const result = await this.runwaysService.syncRunways(icao);
    return {
      success: result.errors.length === 0,
      data: result,
    };
  }

  /**
   * Bulk sync runways from openAIP API to database.
   * POST /metar/runways/bulk-sync
   */
  @Post("runways/bulk-sync")
  @HttpCode(HttpStatus.OK)
  async bulkSyncRunways(@Body() dto: BulkSyncDto) {
    const result = await this.runwaysService.bulkSync(dto.icaos);
    return {
      success: result.errors.length === 0,
      data: result,
    };
  }
}
