export enum FlightCategory {
  LIFR = "LIFR",
  IFR = "IFR",
  MVFR = "MVFR",
  VFR = "VFR",
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
  isCrosswindFrom: "L" | "R"; // Left or Right
}

// Simplified wind type for API response
export interface ApiWind {
  degrees: number;
  speed: number;
  gust?: number;
  unit?: string;
  isVariable?: boolean;
  variableFrom?: number;
  variableTo?: number;
}

export interface MetarResponse {
  icao: string;
  raw: string;
  decoded: {
    station: string;
    time: Date;
    auto: boolean;
    corrected: boolean;
    wind?: ApiWind;
    visibility?: {
      value: number;
      unit: string;
    };
    clouds?: Array<{
      amount: string;
      height?: number;
      type?: string;
    }>;
    flightCategory: FlightCategory;
    temperature?: number;
    dewpoint?: number;
    humidity?: number;
    altimeter?: number;
    remarks?: string;
  };
}

export interface TafResponse {
  icao: string;
  raw: string;
  decoded: {
    station: string;
    time: Date;
    validFrom: Date;
    validUntil: Date;
    forecasts: Array<{
      time?: Date;
      wind?: ApiWind;
      visibility?: number;
      clouds?: Array<{
        amount: string;
        height?: number;
      }>;
    }>;
    remarks?: string;
  };
}

export interface WeatherResponse {
  metar: MetarResponse;
  taf?: TafResponse;
  runways?: RunwayInfo[];
  windComponents?: WindComponent[];
  runwayInUse?: string;
}

import { IsArray, IsString, IsNotEmpty, Matches } from "class-validator";

export class BulkSyncDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Matches(/^[A-Z]{4}$/, {
    each: true,
    message: "Each ICAO must be 4 uppercase letters",
  })
  icaos: string[];
}
