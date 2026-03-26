export type StandbyType = "none" | "airport" | "home" | "reserve";

export interface StandbyInput {
  type: StandbyType;
  startTime: string; // "HH:MM"
  callTime: string; // "HH:MM" — time Malta Air called the crew (home standby only)
  splitDuty: boolean; // home standby: 8h threshold instead of 6h
}

export interface FdpResult {
  maxFdp: number; // minutes
  tableMax: number; // minutes (from Table 2)
  awakeMax: number; // minutes remaining before hitting 18h (Number.MAX_SAFE_INTEGER if not applicable)
  assumedWakeMinutes: number | null; // null when 18h rule doesn't apply
  limitedByAwake: boolean;
  limitedByStandby: boolean;
  limitedBy16hCap: boolean; // airport standby: combined SBY+FDP capped at 16h
  standbyReduction: number; // minutes
  woclEncroachmentMin: number; // minutes overlapping with WOCL
  isEarlyStart: boolean;
  isNightDuty: boolean; // start 02:00–04:59 OR end 02:00–05:59 with start <02:00
}

export interface ExtensionResult {
  allowed: boolean;
  extendedFdp: number; // minutes
  reason?: string;
}

export interface MinRestResult {
  minRest: number; // minutes
}
