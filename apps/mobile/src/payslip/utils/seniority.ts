import { SeniorityBracket, RankContract, UserContext } from "../types";

export const CAPTAIN_GRADES = ["cpt", "ltc", "lcc", "tri", "tre"];

export function getSeniorityDate(userContext: UserContext): string | null {
  const grade = userContext.gradeCode?.toLowerCase() ?? "";
  if (CAPTAIN_GRADES.includes(grade)) {
    return userContext.dateOfCaptaincy ?? null;
  }
  return userContext.dateOfEntry ?? null;
}

export function getPrecedingApril1(referenceDate: string): Date {
  const d = new Date(referenceDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 4) {
    return new Date(year, 3, 1);
  }
  return new Date(year - 1, 3, 1);
}

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
