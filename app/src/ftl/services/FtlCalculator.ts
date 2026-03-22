import {
  findBand,
  sectorIndex,
  calcWoclEncroachment,
  MAX_AWAKE,
  MIN_FDP,
} from "../data/ftlTables";
import {
  StandbyInput,
  FdpResult,
  ExtensionResult,
  MinRestResult,
} from "../types";

/** Convert "HH:MM" string to minutes from midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Convert minutes to "HH:MM" string. */
export function minutesToTime(minutes: number): string {
  const total = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format minutes as duration "HH:MM". */
export function minutesToDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Calculate active home standby time (minutes).
 * Night period 2300–0700 does NOT count toward the 6/8h threshold
 * if the crew was not contacted during that period.
 */
function calcActiveHomeStandby(
  startMin: number,
  nowMin: number,
  contactedDuringNight: boolean,
): number {
  const total = (nowMin - startMin + 1440) % 1440;
  if (contactedDuringNight) return total;
  // Night: 2300(1380) – 0700(420)
  const nightStart = 23 * 60; // 1380
  const nightEnd = 7 * 60; // 420
  // Compute overlap of [startMin, nowMin] with night period
  let nightOverlap = 0;
  for (let d = 0; d <= 1; d++) {
    const ns = nightStart + d * 1440;
    const ne = nightEnd + (d + 1) * 1440;
    const s = startMin + d * 0; // already absolute
    const e = startMin + total;
    const oStart = Math.max(s, ns);
    const oEnd = Math.min(e, ne);
    if (oEnd > oStart) nightOverlap += oEnd - oStart;
  }
  return Math.max(0, total - nightOverlap);
}

/**
 * Compute the assumed wake time (minutes from midnight) for home standby,
 * based on the OMA Part A §7.14 table.
 *
 * | SBY start    | Mandatory end of combined SBY+FDP                      |
 * | 2000–2300    | 18h from 1900 (fixed, no callout adjustment)            |
 * | 2300–0700    | min(0700 + 18h, callout + 18h) → assumedWake = min(0700, callout) |
 * | 0700–2000    | min(1000 + 18h, callout + 18h) → assumedWake = min(1000, callout) |
 */
function homeSbyAssumedWake(sbyStartMin: number, calloutMin: number): number {
  // Night SBY: 2000–2300 (fixed: 18h from 1900, callout irrelevant)
  if (sbyStartMin >= 20 * 60 && sbyStartMin < 23 * 60) {
    return 19 * 60; // 1900
  }

  // SBY 2300–0700 → baseWake 0700; SBY 0700–2000 → baseWake 1000
  const isEarlyMorning = sbyStartMin >= 23 * 60 || sbyStartMin < 7 * 60;
  const baseWake = isEarlyMorning ? 7 * 60 : 10 * 60; // 420 or 600

  // Midnight normalization: only needed for the 2300–0700 band (baseWake = 0700).
  // A pre-midnight callout (e.g. 23:30 = 1410 min) must be treated as
  // "before 07:00 next morning" so it shifts the 18h clock earlier.
  // For 0700–2000 band (baseWake = 1000) the callout is always daytime — no wrap.
  let calloutNorm = calloutMin;
  if (baseWake === 7 * 60 && calloutMin >= 12 * 60) {
    calloutNorm = calloutMin - 1440; // shift to negative = evening before
  }

  // assumedWake = min(baseWake, callout): whoever is earlier starts the 18h clock
  const assumedNorm = Math.min(baseWake, calloutNorm);
  return ((assumedNorm % 1440) + 1440) % 1440;
}

/**
 * Calculate the maximum FDP for a given report time and number of sectors.
 *
 * 18h awake rule: applies ONLY for home standby per Malta Air OMA §7.14.
 * Airport standby uses FDP reduction (excess over 4h) but no separate 18h check.
 * Regular FDP has no 18h awake constraint.
 *
 * @param reportMinutes  Report time in minutes from midnight
 * @param sectors        Number of sectors (1–10+)
 * @param standby        Standby information (optional)
 */
export function calcMaxFdp(
  reportMinutes: number,
  sectors: number,
  standby?: StandbyInput,
): FdpResult {
  // 1. Find Table 2 band
  const band = findBand(reportMinutes);
  const tableMax = band ? band.limits[sectorIndex(sectors)] : MIN_FDP;

  // 2. 18h awake rule — only for home standby (OMA §7.14 table)
  let awakeMax = Number.MAX_SAFE_INTEGER; // no limit for regular FDP or airport standby
  let assumedWakeMinutes: number | null = null;
  const standbyType = standby?.type ?? "none";

  if (standbyType === "home" && standby?.startTime) {
    // OMA table: assumed wake from standby start + callout time
    const sbyStart = timeToMinutes(standby.startTime);
    const calloutMin = standby.callTime
      ? timeToMinutes(standby.callTime)
      : reportMinutes; // fallback: assume called at report time
    assumedWakeMinutes = homeSbyAssumedWake(sbyStart, calloutMin);
    const awakeBeforeReport =
      (reportMinutes - assumedWakeMinutes + 1440) % 1440;
    awakeMax = MAX_AWAKE - awakeBeforeReport;
  }

  // 3. Standby reduction
  let standbyReduction = 0;
  if (standbyType === "airport" && standby?.startTime) {
    const sbyStart = timeToMinutes(standby.startTime);
    const sbyDuration = (reportMinutes - sbyStart + 1440) % 1440;
    standbyReduction = Math.max(sbyDuration - 240, 0); // excess over 4h
  } else if (standbyType === "home" && standby?.startTime) {
    const sbyStart = timeToMinutes(standby.startTime);
    const activeStandby = calcActiveHomeStandby(sbyStart, reportMinutes, false);
    const threshold = standby.splitDuty ? 480 : 360; // 8h or 6h
    if (activeStandby > threshold) {
      standbyReduction = activeStandby - threshold;
    }
  }

  // 4. Effective max FDP
  const reducedTableMax = tableMax - standbyReduction;
  const limitedByAwake = awakeMax < reducedTableMax;
  const limitedByStandby = standbyReduction > 0;
  const effectiveMax = Math.max(MIN_FDP, Math.min(reducedTableMax, awakeMax));

  // 5. WOCL encroachment
  const woclEncroachmentMin = calcWoclEncroachment(reportMinutes, effectiveMax);

  // 6. Early start (05:00–05:59)
  const isEarlyStart = reportMinutes >= 300 && reportMinutes < 360;

  return {
    maxFdp: effectiveMax,
    tableMax,
    awakeMax,
    assumedWakeMinutes,
    limitedByAwake,
    limitedByStandby,
    standbyReduction,
    woclEncroachmentMin,
    isEarlyStart,
  };
}

/**
 * Calculate minimum rest after a duty period.
 *
 * @param dutyMinutes  Duty duration in minutes
 * @param isHomeBase   Whether crew is at home base
 */
export function calcMinRest(
  dutyMinutes: number,
  isHomeBase: boolean,
): MinRestResult {
  const minRest = isHomeBase
    ? Math.max(dutyMinutes, 720) // max(duty, 12h)
    : Math.max(dutyMinutes, 600); // max(duty, 10h)
  return { minRest };
}

/**
 * Calculate whether an FDP extension is allowed.
 *
 * Note: 18h awake check is only applicable when called from standby.
 * For regular FDP the extension check is purely based on sectors and WOCL.
 *
 * @param reportMinutes     Report time in minutes from midnight
 * @param sectors           Number of sectors
 * @param extType           Extension type
 * @param woclEncroachment  WOCL overlap in minutes
 * @param standby           Standby info (optional — needed for 18h check)
 */
export function calcExtension(
  reportMinutes: number,
  sectors: number,
  extType: "planned" | "discretionary",
  woclEncroachment: number,
  standby?: StandbyInput,
): ExtensionResult {
  const base = calcMaxFdp(reportMinutes, sectors, standby);
  const extensionAmount = extType === "planned" ? 60 : 120;
  const extendedFdp = base.maxFdp + extensionAmount;

  // 18h awake check — only for airport/home standby
  // base.awakeMax = MAX_AWAKE - awakeBeforeReport
  // violation if extendedFdp > base.awakeMax (i.e. total awake > 18h)
  if (
    standby &&
    (standby.type === "airport" || standby.type === "home") &&
    base.awakeMax !== Number.MAX_SAFE_INTEGER &&
    extendedFdp > base.awakeMax
  ) {
    return {
      allowed: false,
      extendedFdp,
      reason: "awakeRuleViolated",
    };
  }

  if (extType === "planned") {
    // Planned extension sector limits based on WOCL encroachment
    const woclHours = woclEncroachment / 60;
    if (woclHours > 2 && sectors > 2) {
      return {
        allowed: false,
        extendedFdp,
        reason: "maxSectorsExceeded",
      };
    }
    if (woclHours > 0 && woclHours <= 2 && sectors > 4) {
      return {
        allowed: false,
        extendedFdp,
        reason: "maxSectorsExceeded",
      };
    }
    if (woclHours === 0 && sectors > 5) {
      return {
        allowed: false,
        extendedFdp,
        reason: "maxSectorsExceeded",
      };
    }
  }

  return { allowed: true, extendedFdp };
}
