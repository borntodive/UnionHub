import { SeniorityBracket, RankContract, UserContext } from "../types";

/** Grade codes that use dateOfCaptaincy as the seniority start date */
export const CAPTAIN_GRADES = ["cpt", "ltc", "lcc", "tri", "tre"];

/**
 * Returns the relevant seniority start date for the user:
 * - Captain grades → dateOfCaptaincy
 * - All others      → dateOfEntry
 */
export function getSeniorityDate(userContext: UserContext): string | null {
  const grade = userContext.gradeCode?.toLowerCase() ?? "";
  if (CAPTAIN_GRADES.includes(grade)) {
    return userContext.dateOfCaptaincy ?? null;
  }
  return userContext.dateOfEntry ?? null;
}

/**
 * Returns the April 1 cutoff date preceding the reference date:
 * - month >= 4 (April–December) → April 1 of the same year
 * - month < 4  (January–March)  → April 1 of the previous year
 */
export function getPrecedingApril1(referenceDate: string): Date {
  const d = new Date(referenceDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-based
  if (month >= 4) {
    return new Date(year, 3, 1); // April 1 current year
  }
  return new Date(year - 1, 3, 1); // April 1 previous year
}

/**
 * Computes whole completed years of seniority as of the preceding April 1.
 */
export function computeSeniorityYears(
  seniorityDate: string,
  referenceDate: string,
): number {
  const cutoff = getPrecedingApril1(referenceDate);
  const start = new Date(seniorityDate);
  if (start >= cutoff) return 0;

  let years = cutoff.getFullYear() - start.getFullYear();
  const monthDiff = cutoff.getMonth() - start.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && cutoff.getDate() < start.getDate())
  ) {
    years--;
  }
  return Math.max(0, years);
}

/**
 * Finds the seniority bracket that matches the given number of years.
 * Returns null if no bracket matches.
 */
export function findSeniorityBracket(
  brackets: SeniorityBracket[],
  years: number,
): SeniorityBracket | null {
  return (
    brackets.find(
      (b) =>
        years >= b.minYears && (b.maxYears === null || years <= b.maxYears),
    ) ?? null
  );
}

/**
 * Merges a seniority bracket's overrides into a RankContract.
 * Only fields explicitly present in the bracket are overridden.
 */
export function applySeniorityBracket(
  contract: RankContract,
  bracket: SeniorityBracket,
): RankContract {
  return {
    ...contract,
    ...(bracket.basic !== undefined && { basic: bracket.basic }),
    ...(bracket.ffp !== undefined && { ffp: bracket.ffp }),
    ...(bracket.sbh !== undefined && { sbh: bracket.sbh }),
    ...(bracket.al !== undefined && { al: bracket.al }),
    ...(bracket.oob !== undefined && { oob: bracket.oob }),
    ...(bracket.diaria !== undefined && { diaria: bracket.diaria }),
    ...(bracket.rsa !== undefined && { rsa: bracket.rsa }),
    ...(bracket.itud !== undefined && { itud: bracket.itud }),
    ...(bracket.allowance !== undefined && { allowance: bracket.allowance }),
    ...(bracket.woff !== undefined && { woff: bracket.woff }),
  };
}
