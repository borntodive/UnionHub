/**
 * ICAO Cold Temperature Correction (CTC) tables.
 * Source: ICAO Doc 8168 (PANS-OPS), Table I-4-1
 *
 * Corrections are added to the published altitude when the airport temperature
 * is below 0°C to account for the reduction in true altitude caused by cold air.
 */

// Temperature rows: 0, -10, -20, -30, -40, -50 °C
export const CTC_TEMP_ROWS = [0, -10, -20, -30, -40, -50];

// Height columns in feet
export const CTC_HEIGHT_COLS_FT = [
  200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 3000,
];

// Height columns in metres
export const CTC_HEIGHT_COLS_M = [
  60, 90, 120, 150, 180, 210, 240, 270, 300, 450, 600, 900,
];

/**
 * CTC correction table in feet.
 * Rows: temperatures [0, -10, -20, -30, -40, -50] °C
 * Cols: heights [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 3000] ft
 */
export const CTC_TABLE_FT: number[][] = [
  // 0°C
  [10, 10, 10, 20, 20, 20, 20, 20, 20, 30, 40, 60],
  // -10°C
  [20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 290],
  // -20°C
  [30, 50, 70, 90, 110, 120, 140, 160, 180, 260, 350, 520],
  // -30°C
  [50, 70, 100, 120, 150, 170, 200, 220, 250, 370, 490, 740],
  // -40°C
  [60, 90, 120, 150, 180, 220, 250, 280, 310, 470, 630, 950],
  // -50°C
  [70, 110, 150, 190, 230, 270, 300, 340, 380, 570, 760, 1140],
];

/**
 * CTC correction table in metres.
 * Rows: temperatures [0, -10, -20, -30, -40, -50] °C
 * Cols: heights [60, 90, 120, 150, 180, 210, 240, 270, 300, 450, 600, 900] m
 */
export const CTC_TABLE_M: number[][] = [
  // 0°C
  [2, 2, 2, 4, 5, 5, 6, 6, 6, 10, 12, 18],
  // -10°C
  [5, 8, 11, 14, 17, 20, 23, 26, 29, 43, 58, 86],
  // -20°C
  [8, 13, 19, 24, 30, 34, 39, 44, 49, 73, 98, 147],
  // -30°C
  [12, 19, 27, 34, 42, 49, 55, 62, 70, 105, 140, 209],
  // -40°C
  [17, 26, 35, 44, 53, 62, 70, 79, 88, 131, 175, 264],
  // -50°C
  [21, 33, 44, 55, 67, 78, 89, 100, 111, 166, 220, 331],
];

/** Linear interpolation helper */
function lerp(
  t: number,
  t0: number,
  t1: number,
  v0: number,
  v1: number,
): number {
  if (t1 === t0) return v0;
  return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
}

/**
 * Look up the CTC correction for a given temperature and height above the
 * altimeter source, using the feet table.
 *
 * Returns 0 when tempC > 0 (no correction required).
 * Interpolates linearly between table rows and columns.
 * Extrapolates proportionally beyond the largest column.
 */
export function getCorrectionFt(tempC: number, heightFt: number): number {
  if (tempC > 0) return 0;
  if (heightFt <= 0) return 0;

  const temps = CTC_TEMP_ROWS;
  const heights = CTC_HEIGHT_COLS_FT;
  const table = CTC_TABLE_FT;

  // Clamp temperature to the table range [0, -50]
  const clampedTemp = Math.max(-50, Math.min(0, tempC));

  // Find surrounding temperature row indices
  let ri0 = 0;
  let ri1 = 0;
  for (let i = 0; i < temps.length - 1; i++) {
    if (clampedTemp <= temps[i] && clampedTemp >= temps[i + 1]) {
      ri0 = i;
      ri1 = i + 1;
      break;
    }
    ri0 = i + 1;
    ri1 = i + 1;
  }

  // Helper: interpolate/extrapolate a single table row for the given height
  function interpolateRow(row: number[]): number {
    const maxCol = heights[heights.length - 1];
    if (heightFt >= maxCol) {
      // Extrapolate beyond the last column
      return (heightFt / maxCol) * row[heights.length - 1];
    }
    // Find surrounding height column indices
    for (let j = 0; j < heights.length - 1; j++) {
      if (heightFt <= heights[j]) {
        // Below or at the first column: interpolate from 0
        if (j === 0) return lerp(heightFt, 0, heights[0], 0, row[0]);
        return lerp(heightFt, heights[j - 1], heights[j], row[j - 1], row[j]);
      }
      if (heightFt >= heights[j] && heightFt <= heights[j + 1]) {
        return lerp(heightFt, heights[j], heights[j + 1], row[j], row[j + 1]);
      }
    }
    return row[heights.length - 1];
  }

  const v0 = interpolateRow(table[ri0]);
  if (ri0 === ri1) return v0;

  const v1 = interpolateRow(table[ri1]);
  return lerp(clampedTemp, temps[ri0], temps[ri1], v0, v1);
}

/**
 * Look up the CTC correction for a given temperature and height above the
 * altimeter source, using the metres table.
 */
export function getCorrectionM(tempC: number, heightM: number): number {
  if (tempC > 0) return 0;
  if (heightM <= 0) return 0;

  const temps = CTC_TEMP_ROWS;
  const heights = CTC_HEIGHT_COLS_M;
  const table = CTC_TABLE_M;

  const clampedTemp = Math.max(-50, Math.min(0, tempC));

  let ri0 = 0;
  let ri1 = 0;
  for (let i = 0; i < temps.length - 1; i++) {
    if (clampedTemp <= temps[i] && clampedTemp >= temps[i + 1]) {
      ri0 = i;
      ri1 = i + 1;
      break;
    }
    ri0 = i + 1;
    ri1 = i + 1;
  }

  function interpolateRow(row: number[]): number {
    const maxCol = heights[heights.length - 1];
    if (heightM >= maxCol) {
      return (heightM / maxCol) * row[heights.length - 1];
    }
    for (let j = 0; j < heights.length - 1; j++) {
      if (heightM <= heights[j]) {
        if (j === 0) return lerp(heightM, 0, heights[0], 0, row[0]);
        return lerp(heightM, heights[j - 1], heights[j], row[j - 1], row[j]);
      }
      if (heightM >= heights[j] && heightM <= heights[j + 1]) {
        return lerp(heightM, heights[j], heights[j + 1], row[j], row[j + 1]);
      }
    }
    return row[heights.length - 1];
  }

  const v0 = interpolateRow(table[ri0]);
  if (ri0 === ri1) return v0;

  const v1 = interpolateRow(table[ri1]);
  return lerp(clampedTemp, temps[ri0], temps[ri1], v0, v1);
}

/**
 * Round an altitude up to the nearest 100 (ft or m).
 * If already a multiple of 100, returns the value unchanged.
 */
export function roundUpTo100(alt: number): number {
  if (alt % 100 === 0) return alt;
  return Math.ceil(alt / 100) * 100;
}
