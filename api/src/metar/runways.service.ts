import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Runway } from "./entities/runway.entity";
import { Volmet } from "../volmet/entities/volmet.entity";
import {
  OpenAipService,
  OpenAipAirport,
  OpenAipRunway,
} from "../common/services/openaip.service";
import { RunwayInfo } from "./dto/metar.dto";

export interface SyncResult {
  added: number;
  errors: string[];
}

@Injectable()
export class RunwaysService {
  private readonly logger = new Logger(RunwaysService.name);

  constructor(
    @InjectRepository(Runway)
    private readonly runwayRepository: Repository<Runway>,
    @InjectRepository(Volmet)
    private readonly volmetRepository: Repository<Volmet>,
    private readonly openAipService: OpenAipService,
  ) {}

  /**
   * Get runways for an airport from database.
   */
  async getRunways(icao: string): Promise<RunwayInfo[]> {
    const runways = await this.runwayRepository.find({
      where: { icao: icao.toUpperCase() },
      order: { number: "ASC" },
    });

    return runways.map((r) => ({
      number: r.number,
      heading: r.heading,
      length: r.length ?? undefined,
      width: r.width ?? undefined,
      surface: r.surface ?? undefined,
    }));
  }

  /**
   * Check if runways exist for an airport.
   */
  async hasRunways(icao: string): Promise<boolean> {
    const count = await this.runwayRepository.count({
      where: { icao: icao.toUpperCase() },
    });
    return count > 0;
  }

  /**
   * Sync runways from openAIP API to database.
   * Also updates ATIS frequency if found.
   */
  async syncRunways(icao: string): Promise<SyncResult> {
    const upperIcao = icao.toUpperCase();
    const result: SyncResult = { added: 0, errors: [] };

    try {
      // Fetch full airport data from openAIP (includes runways and frequencies)
      const airport = await this.openAipService.fetchAirport(upperIcao);

      if (!airport) {
        this.logger.warn(`Airport ${upperIcao} not found in openAIP`);
        return result;
      }

      const openAipRunways = airport.runways?.map((r) =>
        this.openAipService.parseRunway(r),
      );

      if (!openAipRunways || openAipRunways.length === 0) {
        this.logger.warn(`No runway data found for ${upperIcao}`);
        // Still continue to update ATIS even if no runways
      }

      // Update ATIS frequency if found
      const atis = this.openAipService.getAtisFrequency(airport);
      if (atis) {
        const volmet = await this.volmetRepository.findOne({
          where: { icao: upperIcao },
        });
        if (volmet) {
          volmet.atis = atis;
          await this.volmetRepository.save(volmet);
          this.logger.log(`Updated ATIS for ${upperIcao}: ${atis}`);
        }
      }

      // Delete existing runways for this airport
      await this.runwayRepository.delete({ icao: upperIcao });

      // openAIP returns runways with name like "16/34" or "16L/34R"
      // We need to parse these into separate runway directions
      const runwayEntities: Runway[] = [];
      const seenRunways = new Set<string>();

      for (const r of openAipRunways || []) {
        // Parse runway name (e.g., "16/34" -> ["16", "34"])
        const directions = r.name.split("/");

        for (const dir of directions) {
          const trimmedDir = dir.trim();
          if (!trimmedDir) continue;

          // Skip duplicates
          const key = `${upperIcao}-${trimmedDir}`;
          if (seenRunways.has(key)) {
            this.logger.warn(
              `Duplicate runway detected: ${trimmedDir} for ${upperIcao}`,
            );
            continue;
          }
          seenRunways.add(key);

          const entity = new Runway();
          entity.icao = upperIcao;
          entity.number = trimmedDir;
          entity.heading = this.calculateHeading(trimmedDir, r.heading);
          entity.length = Math.round(r.length); // meters
          entity.width = Math.round(r.width); // meters
          entity.surface = r.surface ?? null;
          runwayEntities.push(entity);
        }

        result.added += directions.length;
      }

      if (runwayEntities.length > 0) {
        await this.runwayRepository.save(runwayEntities);
        this.logger.log(
          `Synced ${runwayEntities.length} runway directions for ${upperIcao}`,
        );
      }
    } catch (error) {
      const errorMsg = `Failed to sync runways for ${upperIcao}: ${error}`;
      this.logger.error(errorMsg);
      result.errors.push(errorMsg);
    }

    return result;
  }

  /**
   * Calculate runway heading based on runway number and base heading.
   * openAIP provides heading for the first direction, we calculate the reciprocal.
   */
  private calculateHeading(runwayNumber: string, baseHeading: number): number {
    // Extract numeric part (e.g., "16L" -> 16, "34R" -> 34)
    const numMatch = runwayNumber.match(/^(\d{1,2})/);
    if (!numMatch) return Math.round(baseHeading);

    const num = parseInt(numMatch[1], 10);
    const calculatedHeading = num * 10;

    // Check if this is the reciprocal direction
    // If baseHeading is ~160 and we calculate 340, use calculatedHeading
    // If baseHeading is ~340 and we calculate 160, use calculatedHeading
    const diff = Math.abs(calculatedHeading - baseHeading);
    if (diff > 90 && diff < 270) {
      // Reciprocal
      return calculatedHeading;
    }

    // Same direction as base, use baseHeading
    return Math.round(baseHeading);
  }

  /**
   * Bulk sync runways for multiple airports.
   */
  async bulkSync(icaos: string[]): Promise<SyncResult> {
    this.logger.log(`Starting bulk sync for ${icaos.length} airports`);

    const totalResult: SyncResult = { added: 0, errors: [] };

    for (const icao of icaos) {
      const result = await this.syncRunways(icao);
      totalResult.added += result.added;
      totalResult.errors.push(...result.errors);
    }

    this.logger.log(
      `Bulk sync completed: ${totalResult.added} added, ${totalResult.errors.length} errors`,
    );

    return totalResult;
  }
}
