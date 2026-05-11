import apiClient from "./client";

export enum FlightCategory {
  LIFR = "LIFR",
  IFR = "IFR",
  MVFR = "MVFR",
  VFR = "VFR",
}

export enum TrendType {
  NOSIG = "NOSIG",
  BECMG = "BECMG",
  TEMPO = "TEMPO",
  INTER = "INTER",
  PROB = "PROB",
  FM = "FM",
}

export interface Wind {
  degrees: number;
  speed: number;
  gust?: number;
  unit?: string;
  isVariable?: boolean;
  variableFrom?: number;
  variableTo?: number;
}

export interface Cloud {
  amount: string;
  height?: number;
  type?: string;
}

export interface WeatherCondition {
  descriptive?: string;
  phenomenons?: string[];
}

export interface MetarDecoded {
  station: string;
  time: string;
  auto: boolean;
  corrected: boolean;
  wind?: Wind;
  visibility?: {
    value: number;
    unit: string;
  };
  clouds?: Cloud[];
  flightCategory: FlightCategory;
  temperature?: number;
  dewpoint?: number;
  humidity?: number;
  altimeter?: number;
  remarks?: string;
  trends?: MetarTrend[];
}

export interface MetarTrend {
  type?: TrendType;
  wind?: Wind;
  visibility?: number;
  clouds?: Cloud[];
  weatherConditions?: WeatherCondition[];
}

export interface Metar {
  icao: string;
  raw: string;
  decoded: MetarDecoded;
}

export interface TafForecast {
  type?: TrendType;
  probability?: number;
  time?: string;
  validTo?: string;
  wind?: Wind;
  visibility?: number;
  clouds?: Cloud[];
  weatherConditions?: WeatherCondition[];
}

export interface TafDecoded {
  station: string;
  time: string;
  validFrom: string;
  validUntil: string;
  forecasts: TafForecast[];
  remarks?: string;
}

export interface Taf {
  icao: string;
  raw: string;
  decoded: TafDecoded;
}

export interface RunwayInfo {
  number: string;
  heading: number;
  length?: number;
  width?: number;
  surface?: string;
}

export interface WindComponent {
  runway: string;
  heading: number;
  headwindKnots: number;
  crosswindKnots: number;
  isCrosswindFrom: "L" | "R";
}

export interface WeatherResponse {
  metar: Metar;
  taf?: Taf;
  runways?: RunwayInfo[];
  windComponents?: WindComponent[];
  runwayInUse?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export const metarApi = {
  getMetar: async (icao: string): Promise<Metar | null> => {
    try {
      const response = await apiClient.get<ApiResponse<Metar>>(
        `/metar/${icao}`,
      );
      return response.data.data ?? null;
    } catch (error) {
      console.error("Failed to fetch METAR:", error);
      return null;
    }
  },

  getTaf: async (icao: string): Promise<Taf | null> => {
    try {
      const response = await apiClient.get<ApiResponse<Taf>>(
        `/metar/${icao}/taf`,
      );
      return response.data.data ?? null;
    } catch (error) {
      console.error("Failed to fetch TAF:", error);
      return null;
    }
  },

  getWeather: async (icao: string): Promise<WeatherResponse | null> => {
    try {
      const response = await apiClient.get<ApiResponse<WeatherResponse>>(
        `/metar/${icao}/weather`,
      );
      return response.data.data ?? null;
    } catch (error) {
      console.error("Failed to fetch weather:", error);
      return null;
    }
  },

  getRunways: async (icao: string): Promise<RunwayInfo[] | null> => {
    try {
      const response = await apiClient.get<ApiResponse<RunwayInfo[]>>(
        `/metar/${icao}/runways`,
      );
      return response.data.data ?? null;
    } catch (error) {
      console.error("Failed to fetch runways:", error);
      return null;
    }
  },

  syncRunways: async (icao: string): Promise<RunwayInfo[] | null> => {
    try {
      const response = await apiClient.post<ApiResponse<RunwayInfo[]>>(
        `/metar/${icao}/runways/sync`,
      );
      return response.data.data ?? null;
    } catch (error) {
      console.error("Failed to sync runways:", error);
      return null;
    }
  },

  bulkSyncRunways: async (
    icaos: string[],
  ): Promise<{ added: number; errors: string[] } | null> => {
    try {
      const response = await apiClient.post<
        ApiResponse<{ added: number; errors: string[] }>
      >(`/metar/runways/bulk-sync`, { icaos });
      return response.data.data ?? null;
    } catch (error) {
      console.error("Failed to bulk sync runways:", error);
      return null;
    }
  },
};
