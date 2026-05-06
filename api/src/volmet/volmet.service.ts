import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike } from "typeorm";
import { Volmet } from "./entities/volmet.entity";
import { CreateVolmetDto } from "./dto/create-volmet.dto";
import { UpdateVolmetDto } from "./dto/update-volmet.dto";
import {
  OpenAipService,
  OpenAipAirport,
} from "../common/services/openaip.service";

export interface SyncResult {
  added: number;
  updated: number;
  skipped: number;
  errors: string[];
}

@Injectable()
export class VolmetService {
  private readonly logger = new Logger(VolmetService.name);

  constructor(
    @InjectRepository(Volmet)
    private volmetRepository: Repository<Volmet>,
    private openAipService: OpenAipService,
  ) {}

  async findAll(activeOnly: boolean = false): Promise<Volmet[]> {
    return this.volmetRepository.find({
      where: activeOnly ? { isActive: true } : undefined,
      order: { icao: "ASC" },
    });
  }

  async findByRegion(region: string): Promise<Volmet[]> {
    return this.volmetRepository.find({
      where: { region, isActive: true },
      order: { icao: "ASC" },
    });
  }

  async search(query: string): Promise<Volmet[]> {
    return this.volmetRepository.find({
      where: [
        { icao: ILike(`${query}%`) },
        { name: ILike(`${query}%`) },
        { city: ILike(`${query}%`) },
      ],
      order: { icao: "ASC" },
    });
  }

  async findById(id: string): Promise<Volmet> {
    const volmet = await this.volmetRepository.findOne({
      where: { id },
    });

    if (!volmet) {
      throw new NotFoundException("VOLMET entry not found");
    }

    return volmet;
  }

  async findByIcao(icao: string): Promise<Volmet | null> {
    return this.volmetRepository.findOne({
      where: { icao: icao.toUpperCase() },
    });
  }

  async create(createVolmetDto: CreateVolmetDto): Promise<Volmet> {
    const existing = await this.findByIcao(createVolmetDto.icao);
    if (existing) {
      throw new ConflictException(
        "VOLMET entry with this ICAO code already exists",
      );
    }

    const volmet = this.volmetRepository.create({
      ...createVolmetDto,
      icao: createVolmetDto.icao.toUpperCase(),
    });

    return this.volmetRepository.save(volmet);
  }

  async update(id: string, updateVolmetDto: UpdateVolmetDto): Promise<Volmet> {
    const volmet = await this.findById(id);

    if (updateVolmetDto.icao) {
      updateVolmetDto.icao = updateVolmetDto.icao.toUpperCase();
    }

    Object.assign(volmet, updateVolmetDto);
    return this.volmetRepository.save(volmet);
  }

  async remove(id: string): Promise<void> {
    const volmet = await this.findById(id);
    await this.volmetRepository.remove(volmet);
  }

  async getRegions(): Promise<string[]> {
    const result = await this.volmetRepository
      .createQueryBuilder("volmet")
      .select("DISTINCT volmet.region", "region")
      .where("volmet.isActive = :isActive", { isActive: true })
      .orderBy("volmet.region", "ASC")
      .getRawMany();

    return result.map((r) => r.region);
  }

  /**
   * Convert openAIP airport to Volmet entity.
   */
  private openAipToVolmet(
    airport: OpenAipAirport,
    region: string,
  ): Partial<Volmet> {
    // Extract relevant frequencies
    // Type codes: 0=APP, 5=DEP, 6=ATIS, 9=GND, 14=TWR
    const frequencies: string[] = [];
    if (airport.frequencies) {
      for (const freq of airport.frequencies) {
        if (
          freq.type === 14 || // TWR
          freq.type === 9 || // GND
          freq.type === 0 || // APP
          freq.type === 5 || // DEP
          freq.type === 6 // ATIS
        ) {
          // value is now a string like "131.250"
          frequencies.push(freq.value);
        }
      }
    }

    // Determine VOLMET region based on country
    const volmetRegions: Record<string, string> = {
      IT: "Italy",
      FR: "France",
      DE: "Germany",
      ES: "Spain",
      GB: "UK",
      GR: "Greece",
      PT: "Portugal",
      MT: "Malta",
    };

    // Coordinates from geometry.coordinates [lon, lat]
    const [lon, lat] = airport.geometry?.coordinates || [0, 0];

    return {
      icao: airport.icaoCode,
      name: airport.name,
      city: airport.name.split(/\s/)[0] || airport.name,
      country: airport.country,
      latitude: lat,
      longitude: lon,
      frequencies: frequencies.length > 0 ? frequencies : ["118.100"],
      region: volmetRegions[airport.country] || region,
      isActive: true,
    };
  }

  /**
   * Sync airports from openAIP.
   * @param countryCode - ISO country code (e.g., "IT") or "ALL" for all countries
   * @param region - VOLMET region name for grouping
   */
  async syncFromOpenAIP(
    countryCode: string = "ALL",
    region: string = "Europe",
  ): Promise<SyncResult> {
    const result: SyncResult = { added: 0, updated: 0, skipped: 0, errors: [] };

    try {
      const airports =
        countryCode === "ALL"
          ? await this.openAipService.fetchAllAirports()
          : await this.openAipService.fetchAirportsByCountry(countryCode);

      this.logger.log(`Processing ${airports.length} airports from openAIP...`);

      for (const airport of airports) {
        try {
          if (!airport.icaoCode) {
            result.skipped++;
            continue;
          }

          const volmetData = this.openAipToVolmet(airport, region);
          const existing = await this.findByIcao(airport.icaoCode);

          if (existing) {
            // Update existing
            Object.assign(existing, volmetData);
            await this.volmetRepository.save(existing);
            result.updated++;
          } else {
            // Create new
            const volmet = this.volmetRepository.create(volmetData);
            await this.volmetRepository.save(volmet);
            result.added++;
          }
        } catch (error) {
          const errorMsg = `Error processing ${airport.icaoCode}: ${error}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      this.logger.log(
        `Sync complete: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`,
      );
    } catch (error) {
      this.logger.error("Failed to sync from openAIP:", error);
      throw error;
    }

    return result;
  }
}
