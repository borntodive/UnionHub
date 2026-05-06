import { RunwayInfo, WindComponent } from "../dto/metar.dto";

/**
 * Calculate wind component for a runway.
 * Returns headwind (positive) or tailwind (negative) in knots.
 */
export function calculateHeadwind(
  windSpeedKnots: number,
  windDirectionDegrees: number,
  runwayHeadingDegrees: number,
): number {
  // Convert to radians and calculate angle difference
  const windRad = (windDirectionDegrees * Math.PI) / 180;
  const runwayRad = (runwayHeadingDegrees * Math.PI) / 180;

  // Headwind = windSpeed * cos(windDir - runwayHeading)
  const headwind = windSpeedKnots * Math.cos(windRad - runwayRad);

  return Math.round(headwind * 10) / 10; // Round to 1 decimal
}

/**
 * Calculate crosswind component for a runway.
 * Positive = from right, Negative = from left.
 */
export function calculateCrosswind(
  windSpeedKnots: number,
  windDirectionDegrees: number,
  runwayHeadingDegrees: number,
): number {
  const windRad = (windDirectionDegrees * Math.PI) / 180;
  const runwayRad = (runwayHeadingDegrees * Math.PI) / 180;

  // Crosswind = windSpeed * sin(windDir - runwayHeading)
  const crosswind = windSpeedKnots * Math.sin(windRad - runwayRad);

  return Math.round(Math.abs(crosswind) * 10) / 10; // Return absolute value
}

/**
 * Determine crosswind direction (left or right).
 */
export function getCrosswindDirection(
  windDirectionDegrees: number,
  runwayHeadingDegrees: number,
): "L" | "R" {
  const angleDiff =
    ((windDirectionDegrees - runwayHeadingDegrees + 540) % 360) - 180;

  // If angle difference is positive, wind is from right
  return angleDiff > 0 ? "R" : "L";
}

/**
 * Calculate wind components for all runways.
 */
export function calculateWindComponents(
  windSpeedKnots: number,
  windDirectionDegrees: number,
  runways: RunwayInfo[],
): WindComponent[] {
  return runways.map((runway) => {
    const headwind = calculateHeadwind(
      windSpeedKnots,
      windDirectionDegrees,
      runway.heading,
    );
    const crosswind = calculateCrosswind(
      windSpeedKnots,
      windDirectionDegrees,
      runway.heading,
    );
    const crosswindFrom = getCrosswindDirection(
      windDirectionDegrees,
      runway.heading,
    );

    return {
      runway: runway.number,
      heading: runway.heading,
      headwindKnots: headwind,
      crosswindKnots: crosswind,
      isCrosswindFrom: crosswindFrom,
    };
  });
}

/**
 * Determine runway in use based on maximum headwind.
 * Returns the runway number with the highest headwind component.
 */
export function determineRunwayInUse(
  windComponents: WindComponent[],
): string | undefined {
  if (windComponents.length === 0) return undefined;

  // Sort by headwind descending, get first
  const sorted = [...windComponents].sort(
    (a, b) => b.headwindKnots - a.headwindKnots,
  );

  // Only suggest if headwind > 5 knots
  return sorted[0].headwindKnots > 5 ? sorted[0].runway : undefined;
}

/**
 * Calculate wind components from runway API data.
 */
export function parseRunwayInfo(
  runways:
    | Array<{
        runway_ident: string;
        length_ft: number;
        width_ft: number;
        surface: string;
        heading_degT: number;
      }>
    | undefined,
): RunwayInfo[] {
  if (!runways) return [];

  return runways
    .filter((r) => r.runway_ident && r.heading_degT)
    .map((r) => ({
      number: r.runway_ident,
      heading: Math.round(r.heading_degT),
      length: r.length_ft,
      width: r.width_ft,
      surface: r.surface,
    }));
}
