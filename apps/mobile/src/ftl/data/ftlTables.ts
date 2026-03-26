// EASA Part-ORO.FTL (EU 83/2014) — Table 2 (acclimatized crew)
// Minutes from midnight. Bands wrap around midnight for the night window.
// limits[]: [1-2 sectors, 3, 4, 5, 6, 7, 8, 9, 10+] in minutes

export interface FtlBand {
  from: number; // minutes from midnight (inclusive)
  to: number; // minutes from midnight (exclusive), or <from if wraps midnight
  limits: number[]; // 9 values: index 0 = 1-2 sectors, index 8 = 10+ sectors
}

export const TABLE_2: FtlBand[] = [
  // 06:00–13:29
  {
    from: 360,
    to: 810,
    limits: [780, 750, 720, 690, 660, 630, 600, 570, 540],
  },
  // 13:30–13:59
  {
    from: 810,
    to: 840,
    limits: [765, 735, 705, 675, 645, 615, 585, 555, 540],
  },
  // 14:00–14:29
  {
    from: 840,
    to: 870,
    limits: [750, 720, 690, 660, 630, 600, 570, 540, 540],
  },
  // 14:30–14:59
  {
    from: 870,
    to: 900,
    limits: [735, 705, 675, 645, 615, 585, 555, 540, 540],
  },
  // 15:00–15:29
  {
    from: 900,
    to: 930,
    limits: [720, 690, 660, 630, 600, 570, 540, 540, 540],
  },
  // 15:30–15:59
  {
    from: 930,
    to: 960,
    limits: [705, 675, 645, 615, 585, 555, 540, 540, 540],
  },
  // 16:00–16:29
  {
    from: 960,
    to: 990,
    limits: [690, 660, 630, 600, 570, 540, 540, 540, 540],
  },
  // 16:30–16:59
  {
    from: 990,
    to: 1020,
    limits: [675, 645, 615, 585, 555, 540, 540, 540, 540],
  },
  // 17:00–04:59 (wraps midnight)
  {
    from: 1020,
    to: 300,
    limits: [660, 630, 600, 570, 540, 540, 540, 540, 540],
  },
  // 05:00–05:14
  {
    from: 300,
    to: 315,
    limits: [720, 690, 660, 630, 600, 570, 540, 540, 540],
  },
  // 05:15–05:29
  {
    from: 315,
    to: 330,
    limits: [735, 705, 675, 645, 615, 585, 555, 540, 540],
  },
  // 05:30–05:44
  {
    from: 330,
    to: 345,
    limits: [750, 720, 690, 660, 630, 600, 570, 540, 540],
  },
  // 05:45–05:59
  {
    from: 345,
    to: 360,
    limits: [765, 735, 705, 675, 645, 615, 585, 555, 540],
  },
];

export const WOCL_START = 120; // 02:00
export const WOCL_END = 360; // 06:00 (exclusive)
export const MAX_AWAKE = 1080; // 18 hours
export const MIN_FDP = 540; // 09:00 absolute floor

/** Returns true if reportMinutes falls in the given band (handles wrap-around). */
export function isInBand(band: FtlBand, minutes: number): boolean {
  if (band.from <= band.to) {
    return minutes >= band.from && minutes < band.to;
  }
  // Wraps around midnight
  return minutes >= band.from || minutes < band.to;
}

/** Find the Table 2 band for a given report time (minutes from midnight). */
export function findBand(reportMinutes: number): FtlBand | undefined {
  return TABLE_2.find((b) => isInBand(b, reportMinutes));
}

/** Sector index: sectors 1-2 → 0, 3→1, 4→2, …, 10+→8 */
export function sectorIndex(sectors: number): number {
  if (sectors <= 2) return 0;
  if (sectors >= 10) return 8;
  return sectors - 2;
}

/** Compute overlap in minutes between [start, start+duration] and WOCL [02:00, 06:00).
 *  All times are minutes from midnight; duration is in minutes. */
export function calcWoclEncroachment(
  reportMinutes: number,
  fdpMinutes: number,
): number {
  // Map to a 0-2879 range to handle up to 48h spans
  const fdpEnd = reportMinutes + fdpMinutes;
  // WOCL windows: [120,360) and possibly the next day [120+1440,360+1440)
  let overlap = 0;
  for (const offset of [0, 1440]) {
    const wStart = WOCL_START + offset;
    const wEnd = WOCL_END + offset;
    const oStart = Math.max(reportMinutes, wStart);
    const oEnd = Math.min(fdpEnd, wEnd);
    if (oEnd > oStart) overlap += oEnd - oStart;
  }
  return overlap;
}
