import apiClient from "./client";

export interface ParsedFlight {
  flightNumber: string | null;
  depAirport: string | null;
  depTime: string | null;
  arrAirport: string | null;
  arrTime: string | null;
}

export interface ParsedDuty {
  reportTime: string | null;
  sectors: number | null;
  standbyType: "none" | "home" | "airport";
  standbyStartTime: string | null;
  finishTime: string | null;
  homeBase: boolean;
  flights: ParsedFlight[];
}

export const ftlApi = {
  parseDuty: (body: { image?: string; text?: string }): Promise<ParsedDuty> =>
    apiClient.post<ParsedDuty>("/ai/parse-duty", body).then((r) => r.data),
};
