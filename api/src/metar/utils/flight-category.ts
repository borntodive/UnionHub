import { FlightCategory } from "../dto/metar.dto";

/**
 * Calculate flight category based on ceiling and visibility.
 * Uses US FAA standard criteria.
 */
export function calculateFlightCategory(
  ceilingFt: number | undefined,
  visibilityMeters: number | undefined,
): FlightCategory {
  const ceiling = ceilingFt ?? 99999;
  const visibility = visibilityMeters ?? 99999;

  // LIFR: Ceiling < 500ft OR visibility < 1SM (1600m)
  if (ceiling < 500 || visibility < 1600) {
    return FlightCategory.LIFR;
  }

  // IFR: Ceiling < 1000ft OR visibility < 3SM (4800m)
  if (ceiling < 1000 || visibility < 4800) {
    return FlightCategory.IFR;
  }

  // MVFR: Ceiling < 3000ft OR visibility < 5SM (8000m)
  if (ceiling < 3000 || visibility < 8000) {
    return FlightCategory.MVFR;
  }

  // VFR: Ceiling >= 3000ft AND visibility >= 5SM
  return FlightCategory.VFR;
}

/**
 * Get ceiling height from cloud layers.
 * Returns undefined if no ceiling (CAVOK, SKC, etc.)
 * Returns 99999 if no broken/overcast layer.
 */
export function getCeilingHeight(
  clouds:
    | Array<{ amount?: string; quantity?: string; height?: number }>
    | undefined,
): number | undefined {
  if (!clouds || clouds.length === 0) {
    return undefined;
  }

  // Find lowest broken (BKN) or overcast (OVC) layer
  const ceilingLayer = clouds
    .filter((c) => {
      const amt = c.amount || c.quantity;
      return amt === "BKN" || amt === "OVC";
    })
    .sort((a, b) => (a.height ?? 0) - (b.height ?? 0))[0];

  // Convert 100s of feet to feet (e.g., 45 = 4500ft)
  return ceilingLayer?.height ? ceilingLayer.height * 100 : undefined;
}

/**
 * Get color code for flight category.
 */
export function getFlightCategoryColor(category: FlightCategory): string {
  switch (category) {
    case FlightCategory.VFR:
      return "#4CAF50"; // Green
    case FlightCategory.MVFR:
      return "#FFC107"; // Yellow/Amber
    case FlightCategory.IFR:
      return "#F44336"; // Red
    case FlightCategory.LIFR:
      return "#D32F2F"; // Dark Red
    default:
      return "#9E9E9E";
  }
}

/**
 * Check if weather phenomenon indicates "bad weather" for red highlighting.
 * CB, TCU, TS, WS, GR, FZRA, etc.
 */
export function isBadWeather(phenomenon?: string): boolean {
  if (!phenomenon) return false;

  const badPhenomena = [
    "TS", // Thunderstorm
    "TSRA", // Thunderstorm with rain
    "TSSN", // Thunderstorm with snow
    "TSGR", // Thunderstorm with hail
    "CB", // Cumulonimbus
    "TCU", // Towering Cumulus
    "WS", // Wind shear
    "GR", // Hail
    "FZRA", // Freezing rain
    "FZDZ", // Freezing drizzle
    "SS", // Sandstorm
    "DS", // Duststorm
  ];

  return badPhenomena.some((bad) => phenomenon.includes(bad));
}
