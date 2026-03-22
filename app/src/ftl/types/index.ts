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
  standbyReduction: number; // minutes
  woclEncroachmentMin: number; // minutes overlapping with WOCL
  isEarlyStart: boolean;
}

export interface ExtensionResult {
  allowed: boolean;
  extendedFdp: number; // minutes
  reason?: string;
}

export interface MinRestResult {
  minRest: number; // minutes
}
