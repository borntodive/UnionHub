import { FlightCategory } from "../api/metar";
import { colors } from "../theme";

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
      return colors.textSecondary;
  }
}

export function getFlightCategoryLabel(category: FlightCategory): string {
  switch (category) {
    case FlightCategory.VFR:
      return "VFR";
    case FlightCategory.MVFR:
      return "MVFR";
    case FlightCategory.IFR:
      return "IFR";
    case FlightCategory.LIFR:
      return "LIFR";
    default:
      return "Unknown";
  }
}

export function isBadWeatherPhenomenon(phenomenon?: string): boolean {
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

export function formatVisibility(visibility?: {
  value: number;
  unit: string;
}): string {
  if (!visibility) return "-";

  if (visibility.unit === "SM") {
    return `${visibility.value} SM`;
  }
  if (visibility.unit === "m") {
    // Convert to km for display
    const km = Math.round(visibility.value / 100) / 10;
    return `${km} km`;
  }
  return `${visibility.value} ${visibility.unit}`;
}

export function formatClouds(
  clouds?: Array<{ amount: string; height?: number; type?: string }>,
): string {
  if (!clouds || clouds.length === 0) return "CLR";

  return clouds
    .map((c) => {
      const height = c.height ? `${Math.round(c.height)}ft` : "";
      const type = c.type ? ` ${c.type}` : "";
      return `${c.amount}${height}${type}`.trim();
    })
    .join(" ");
}

export function formatWind(wind?: {
  degrees: number;
  speed: number;
  gust?: number;
  unit?: string;
  isVariable?: boolean;
  variableFrom?: number;
  variableTo?: number;
}): string {
  if (!wind) return "Calm";

  const speed = Math.round(wind.speed);
  const gust = wind.gust ? `G${Math.round(wind.gust)}` : "";
  const unit = wind.unit || "KT";

  // Always show main direction; variation is displayed separately in UI
  if (wind.isVariable && !wind.degrees) {
    return `VRB ${speed}${gust} ${unit}`;
  }

  const degrees = wind.degrees.toString().padStart(3, "0");
  return `${degrees}° ${speed}${gust} ${unit}`;
}

/**
 * Get METAR validity color based on age in minutes.
 * Green: < 30 min, Yellow: 30-60 min, Red: > 60 min
 */
export function getMetarValidityColor(metarTime: string | Date): string {
  const time = typeof metarTime === "string" ? new Date(metarTime) : metarTime;
  const ageMinutes = (Date.now() - time.getTime()) / (1000 * 60);

  if (ageMinutes < 30) return "#4CAF50"; // Green
  if (ageMinutes < 60) return "#FFC107"; // Yellow
  return "#F44336"; // Red
}

/**
 * Get METAR age in minutes.
 */
export function getMetarAgeMinutes(metarTime: string | Date): number {
  const time = typeof metarTime === "string" ? new Date(metarTime) : metarTime;
  return Math.floor((Date.now() - time.getTime()) / (1000 * 60));
}

/**
 * Get METAR age label (e.g., "5 min ago", "1 hr ago").
 */
export function getMetarAgeLabel(metarTime: string | Date): string {
  const ageMinutes = getMetarAgeMinutes(metarTime);

  if (ageMinutes < 1) return "now";
  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  const hours = Math.floor(ageMinutes / 60);
  const mins = ageMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
}

/**
 * Get TAF remaining hours until expiry.
 */
export function getTafRemainingHours(validUntil: string | Date): number {
  const until =
    typeof validUntil === "string" ? new Date(validUntil) : validUntil;
  return Math.max(0, (until.getTime() - Date.now()) / (1000 * 60 * 60));
}

/**
 * Get TAF expiry label (e.g., "12.4 hr left").
 */
export function getTafExpiryLabel(validUntil: string | Date): string {
  const remainingHours = getTafRemainingHours(validUntil);
  if (remainingHours <= 0) return "expired";
  return `${remainingHours.toFixed(1)} hr left`;
}

/**
 * Get TAF validity color based on remaining hours.
 * Green: > 6 hr, Yellow: 2-6 hr, Red: < 2 hr
 */
export function getTafValidityColor(validUntil: string | Date): string {
  const remainingHours = getTafRemainingHours(validUntil);

  if (remainingHours > 6) return "#4CAF50"; // Green
  if (remainingHours > 2) return "#FFC107"; // Yellow
  return "#F44336"; // Red
}
