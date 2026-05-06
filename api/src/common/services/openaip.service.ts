import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface OpenAipAirport {
  _id: string;
  icaoCode: string;
  name: string;
  country: string;
  type: number;
  geometry?: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
  elevation?: {
    value: number;
    unit: number;
  };
  runways?: OpenAipRunwayRaw[];
  frequencies?: Array<{
    value: string;
    type: number;
    name: string;
  }>;
}

interface OpenAipRunwayRaw {
  designator: string;
  trueHeading: number;
  dimension: {
    length: { value: number; unit: number };
    width: { value: number; unit: number };
  };
  surface: {
    composition: number[];
    mainComposite: number;
  };
}

export interface OpenAipRunway {
  name: string;
  length: number;
  width: number;
  surface: string;
  heading: number;
}

interface OpenAiPResponse {
  items: OpenAipAirport[];
  limit: number;
  page: number;
  totalCount: number;
  totalPages: number;
}

@Injectable()
export class OpenAipService {
  private readonly logger = new Logger(OpenAipService.name);
  private readonly baseUrl = "https://api.core.openaip.net/api";

  constructor(private config: ConfigService) {}

  private getApiKey(): string | undefined {
    return this.config.get<string>("OPENAIP_API_KEY");
  }

  /**
   * Fetch single airport by ICAO code using search parameter.
   */
  async fetchAirport(icao: string): Promise<OpenAipAirport | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("OPENAIP_API_KEY not configured");
    }

    const url = `${this.baseUrl}/airports?search=${icao}&limit=10`;
    this.logger.debug(`Fetching airport ${icao} from openAIP...`);

    try {
      const response = await fetch(url, {
        headers: {
          "x-openaip-api-key": apiKey,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(
          `openAIP API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: OpenAiPResponse = await response.json();

      // Find exact ICAO match (case-insensitive)
      const exactMatch = data.items?.find(
        (item) =>
          item.icaoCode && item.icaoCode.toUpperCase() === icao.toUpperCase(),
      );

      return exactMatch ?? null;
    } catch (error) {
      this.logger.error(`Failed to fetch airport ${icao} from openAIP:`, error);
      throw error;
    }
  }

  /**
   * Fetch all airports for a country from openAIP.
   */
  async fetchAirportsByCountry(countryCode: string): Promise<OpenAipAirport[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("OPENAIP_API_KEY not configured");
    }

    const url = `${this.baseUrl}/airports?country=${countryCode}`;
    this.logger.log(`Fetching airports for ${countryCode} from openAIP...`);

    try {
      const response = await fetch(url, {
        headers: {
          "x-openaip-api-key": apiKey,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `openAIP API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: OpenAiPResponse = await response.json();

      this.logger.log(
        `Fetched ${data.items.length} airports for ${countryCode}`,
      );
      return data.items;
    } catch (error) {
      this.logger.error(`Failed to fetch airports from openAIP:`, error);
      throw error;
    }
  }

  /**
   * Fetch all airports (paginated) from openAIP.
   */
  async fetchAllAirports(): Promise<OpenAipAirport[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("OPENAIP_API_KEY not configured");
    }

    const allAirports: OpenAipAirport[] = [];
    let page = 1;
    const limit = 100;

    this.logger.log("Fetching all airports from openAIP...");

    try {
      while (true) {
        const url = `${this.baseUrl}/airports?page=${page}&limit=${limit}`;
        const response = await fetch(url, {
          headers: {
            "x-openaip-api-key": apiKey,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`openAIP API error: ${response.status}`);
        }

        const data: OpenAiPResponse = await response.json();
        allAirports.push(...data.items);

        if (allAirports.length >= data.totalCount) {
          break;
        }

        page++;
      }

      this.logger.log(
        `Fetched ${allAirports.length} total airports from openAIP`,
      );
      return allAirports;
    } catch (error) {
      this.logger.error(`Failed to fetch airports from openAIP:`, error);
      throw error;
    }
  }

  /**
   * Parse openAIP runway to standard format.
   */
  parseRunway(r: OpenAipRunwayRaw): OpenAipRunway {
    // Surface codes: 1=ASP, 2=CON, 3=GRS, 4=GVL, 5=ICE, 6=SAN, 7=SNO, 8=WAT
    const surfaceTypes = [
      "unknown",
      "asphalt",
      "concrete",
      "grass",
      "gravel",
      "ice",
      "sand",
      "snow",
      "water",
    ];
    const surface = surfaceTypes[r.surface.mainComposite] || "unknown";

    return {
      name: r.designator,
      length: r.dimension.length.value, // meters (unit 0)
      width: r.dimension.width.value, // meters (unit 0)
      surface,
      heading: r.trueHeading,
    };
  }

  /**
   * Get runways for an airport.
   */
  async getRunways(icao: string): Promise<OpenAipRunway[]> {
    const airport = await this.fetchAirport(icao);
    return airport?.runways?.map((r) => this.parseRunway(r)) ?? [];
  }

  /**
   * Get ATIS frequency for an airport.
   * Returns null if no ATIS frequency found.
   *
   * openAIP frequency types:
   * - 0 = APP (Approach)
   * - 5 = DEL (Delivery)
   * - 6 = DEP (Departure)
   * - 9 = GND (Ground)
   * - 14 = TWR (Tower)
   * - 15 = ARR/DEP INFO (Arrival/Departure Information - closest to ATIS)
   */
  getAtisFrequency(airport: OpenAipAirport): string | null {
    if (!airport.frequencies) {
      this.logger.debug(`No frequencies found for ${airport.icaoCode}`);
      return null;
    }

    // Log all frequencies for debugging
    this.logger.debug(
      `Frequencies for ${airport.icaoCode}: ${JSON.stringify(airport.frequencies)}`,
    );

    const nameUpper = (name: string) => name?.toUpperCase() || "";

    // Try multiple approaches to find ATIS:
    // 1. Name contains "ATIS" (exact ATIS frequency)
    let atis = airport.frequencies.find((f) =>
      nameUpper(f.name).includes("ATIS"),
    );

    // 2. Type 15 = Arr/Dep Information (closest to ATIS in openAIP)
    if (!atis) {
      atis = airport.frequencies.find((f) => f.type === 15);
    }

    // 3. Name contains "INFO" or "INFORMATION"
    if (!atis) {
      atis = airport.frequencies.find(
        (f) =>
          nameUpper(f.name).includes("INFO") ||
          nameUpper(f.name).includes("INFORMATION"),
      );
    }

    if (atis) {
      this.logger.log(
        `Found ATIS for ${airport.icaoCode}: ${atis.value} (${atis.name})`,
      );
    } else {
      this.logger.debug(`No ATIS found for ${airport.icaoCode}`);
    }

    return atis?.value ?? null;
  }
}
