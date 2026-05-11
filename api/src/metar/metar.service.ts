import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { parseMetar, parseTAF, ICloud, CloudQuantity } from "metar-taf-parser";
import {
  MetarResponse,
  TafResponse,
  WeatherResponse,
  ApiWind,
  RunwayInfo,
  TrendType,
  TrendForecast,
} from "./dto/metar.dto";
import {
  calculateFlightCategory,
  getCeilingHeight,
  getFlightCategoryColor,
  isBadWeather,
} from "./utils/flight-category";
import {
  calculateWindComponents,
  determineRunwayInUse,
} from "./utils/wind-calculator";
import { RunwaysService } from "./runways.service";

@Injectable()
export class MetarService {
  private readonly logger = new Logger(MetarService.name);
  private readonly noaaBaseUrl = "https://aviationweather.gov/api/data";

  constructor(
    private config: ConfigService,
    private readonly runwaysService: RunwaysService,
  ) {}

  /**
   * Fetch raw METAR from NOAA Aviation Weather.
   */
  private async fetchRawMetar(icao: string): Promise<string | null> {
    try {
      const url = `${this.noaaBaseUrl}/metar?ids=${icao}&format=raw&hours=1`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`NOAA API error: ${response.status}`);
      }

      const text = await response.text();
      if (!text || text.includes("No METAR available")) {
        return null;
      }

      // Get first (most recent) METAR
      const lines = text.trim().split("\n");
      return lines[0]?.trim() || null;
    } catch (error) {
      this.logger.error(`Failed to fetch METAR for ${icao}:`, error);
      return null;
    }
  }

  /**
   * Fetch raw TAF from NOAA Aviation Weather.
   */
  private async fetchRawTaf(icao: string): Promise<string | null> {
    try {
      const url = `${this.noaaBaseUrl}/taf?ids=${icao}&format=raw&hours=1`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`NOAA API error: ${response.status}`);
      }

      const text = await response.text();
      if (!text || text.includes("No TAF available")) {
        return null;
      }

      // TAF can span multiple lines - join all lines of the first TAF
      const lines = text.trim().split("\n");
      // Join all lines until we hit an empty line or another TAF header
      const tafLines: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) break; // Empty line = end of TAF
        if (trimmed.startsWith("TAF") && tafLines.length > 0) break; // New TAF starts
        tafLines.push(trimmed);
      }
      return tafLines.join(" ") || null;
    } catch (error) {
      this.logger.error(`Failed to fetch TAF for ${icao}:`, error);
      return null;
    }
  }

  /**
   * Convert ICloud to simplified cloud format.
   */
  private formatCloud(cloud: ICloud): {
    amount: string;
    height?: number;
    type?: string;
  } {
    return {
      amount: cloud.quantity,
      height: cloud.height,
      type: cloud.type,
    };
  }

  /**
   * Convert IWind to ApiWind.
   */
  private formatWind(wind: any): ApiWind {
    return {
      degrees: wind.degrees ?? 0,
      speed: wind.speed,
      gust: wind.gust,
      unit: wind.unit,
      isVariable: !!(wind.minVariation && wind.maxVariation),
      variableFrom: wind.minVariation,
      variableTo: wind.maxVariation,
    };
  }

  /**
   * Get METAR for an airport.
   */
  async getMetar(icao: string): Promise<MetarResponse | null> {
    const raw = await this.fetchRawMetar(icao);
    if (!raw) {
      return null;
    }

    try {
      const parsed = parseMetar(raw);

      // Calculate flight category
      const ceiling = getCeilingHeight(parsed.clouds);
      const visibilityMeters =
        parsed.visibility?.unit === "m"
          ? parsed.visibility.value
          : parsed.visibility?.unit === "SM"
            ? parsed.visibility.value * 1609.34 // SM to meters
            : undefined;

      const flightCategory = calculateFlightCategory(ceiling, visibilityMeters);

      // Build time from day, hour, minute (METAR/TAF times are UTC)
      const now = new Date();
      const time = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          parsed.day ?? now.getUTCDate(),
          parsed.hour ?? 0,
          parsed.minute ?? 0,
          0,
        ),
      );

      return {
        icao: icao.toUpperCase(),
        raw,
        decoded: {
          station: parsed.station,
          time,
          auto: parsed.auto ?? false,
          corrected: parsed.corrected ?? false,
          wind: parsed.wind ? this.formatWind(parsed.wind) : undefined,
          visibility: parsed.visibility
            ? {
                value: parsed.visibility.value,
                unit: parsed.visibility.unit ?? "m",
              }
            : undefined,
          clouds: parsed.clouds?.map((c) => this.formatCloud(c)),
          flightCategory,
          temperature: parsed.temperature,
          dewpoint: parsed.dewPoint,
          altimeter: parsed.altimeter?.value,
          remarks: parsed.remarks?.map((r) => r.raw).join(" "),
          trends: [
            // NOSIG is stored as boolean property, not in trends array
            ...(parsed.nosig ? [{ type: TrendType.NOSIG as TrendType }] : []),
            // Other trends (TEMPO, BECMG)
            ...(parsed.trends?.map((t: any) => {
              const trend: TrendForecast = {
                type: t.type as TrendType,
              };
              if (t.wind) trend.wind = this.formatWind(t.wind);
              if (t.visibility?.value) trend.visibility = t.visibility.value;
              if (t.clouds)
                trend.clouds = t.clouds.map((c: any) => this.formatCloud(c));
              return trend;
            }) ?? []),
          ],
        },
      };
    } catch (error) {
      this.logger.error(`Failed to parse METAR for ${icao}:`, error);
      return null;
    }
  }

  /**
   * Get TAF for an airport.
   */
  async getTaf(icao: string): Promise<TafResponse | null> {
    const raw = await this.fetchRawTaf(icao);
    if (!raw) {
      return null;
    }

    try {
      const parsed = parseTAF(raw);

      // Build time from day, hour, minute (METAR/TAF times are UTC)
      const now = new Date();
      const time = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          parsed.day ?? now.getUTCDate(),
          parsed.hour ?? 0,
          parsed.minute ?? 0,
          0,
        ),
      );

      // Build valid from/until from validity (TAF times are UTC)
      const validFrom = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          parsed.validity.startDay ?? now.getUTCDate(),
          parsed.validity.startHour ?? 0,
          0,
          0,
        ),
      );

      let validUntil: Date;
      if (parsed.validity.endDay !== undefined) {
        validUntil = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            parsed.validity.endDay,
            parsed.validity.endHour ?? 0,
            0,
            0,
          ),
        );
        // Handle month rollover (e.g., TAF issued on 31st valid until 02nd)
        if (validUntil < validFrom) {
          validUntil.setUTCMonth(validUntil.getUTCMonth() + 1);
        }
      } else {
        // If no end day/hour, assume 24 hours from start
        validUntil = new Date(validFrom.getTime() + 24 * 60 * 60 * 1000);
      }

      return {
        icao: icao.toUpperCase(),
        raw,
        decoded: {
          station: parsed.station,
          time,
          validFrom,
          validUntil,
          forecasts: [
            // Base forecast (from validFrom)
            {
              time: validFrom,
              wind: parsed.wind ? this.formatWind(parsed.wind) : undefined,
              visibility: parsed.visibility?.value,
              clouds: parsed.clouds?.map((c) => this.formatCloud(c)),
            },
            // Change groups (TEMPO, BECMG, FM, PROB)
            ...(parsed.trends?.map((t) => {
              const trend = t as any;
              const weatherData = trend.fcst || trend;
              // Build time from validity for TEMPO/BECMG, or fmDate for FM
              let trendTime: Date | undefined;
              let validTo: Date | undefined;
              if (trend.fmDate) {
                trendTime = trend.fmDate;
              } else if (trend.validity?.startDay !== undefined) {
                trendTime = new Date(
                  Date.UTC(
                    now.getUTCFullYear(),
                    now.getUTCMonth(),
                    trend.validity.startDay,
                    trend.validity.startHour ?? 0,
                    0,
                    0,
                  ),
                );
                // Handle month rollover
                if (trendTime < validFrom) {
                  trendTime.setUTCMonth(trendTime.getUTCMonth() + 1);
                }
                // Build validTo for trends with end time (TEMPO, BECMG, PROB)
                if (trend.validity.endDay !== undefined) {
                  validTo = new Date(
                    Date.UTC(
                      now.getUTCFullYear(),
                      now.getUTCMonth(),
                      trend.validity.endDay,
                      trend.validity.endHour ?? 0,
                      0,
                      0,
                    ),
                  );
                  if (validTo < trendTime) {
                    validTo.setUTCMonth(validTo.getUTCMonth() + 1);
                  }
                }
              }
              return {
                type: trend.type as TrendType,
                probability: trend.probability,
                time: trendTime,
                validTo,
                wind: weatherData.wind
                  ? this.formatWind(weatherData.wind)
                  : undefined,
                visibility: weatherData.visibility?.value,
                clouds: weatherData.clouds?.map((c: any) =>
                  this.formatCloud(c),
                ),
                weatherConditions: weatherData.weatherConditions?.map(
                  (wc: any) => ({
                    descriptive: wc.descriptive,
                    phenomenons: wc.phenomenons,
                  }),
                ),
              };
            }) ?? []),
          ],
          remarks: parsed.remarks?.map((r) => r.raw).join(" "),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to parse TAF for ${icao}:`, error);
      return null;
    }
  }

  /**
   * Get complete weather info: METAR + TAF + runway data + wind components.
   */
  async getWeather(icao: string): Promise<WeatherResponse | null> {
    // Fetch METAR and TAF in parallel
    const [metar, taf] = await Promise.all([
      this.getMetar(icao),
      this.getTaf(icao),
    ]);

    if (!metar) {
      return null;
    }

    // Get runways from DB (empty if not synced yet)
    const runways = await this.runwaysService.getRunways(icao);

    // Calculate wind components if we have wind and runways
    let windComponents;
    let runwayInUse;

    if (metar.decoded.wind && runways.length > 0) {
      windComponents = calculateWindComponents(
        metar.decoded.wind.speed,
        metar.decoded.wind.degrees,
        runways,
      );
      runwayInUse = determineRunwayInUse(windComponents);
    }

    return {
      metar,
      taf: taf ?? undefined,
      runways,
      windComponents,
      runwayInUse,
    };
  }

  /**
   * Get flight category color for UI.
   */
  getFlightCategoryColor(category: string): string {
    return getFlightCategoryColor(category as any);
  }
}
