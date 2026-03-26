// Contract Data for Ryanair (RYR)
// Based on PAYSLIP_CALCULATOR_EXPO_SPEC.md

import { CompanyConfig, ClaCorrection } from "../types";

export const RYR_CONFIG: CompanyConfig = {
  maxContributoAziendaleTfr: 2,
  cuReduction: 0.9,
  unpayedLeaveDays: {
    pil: 17,
    cc: 19,
  },
  inpsDays: 26,
  unionFees: {
    cpt: 40,
    fo: 20,
    cc: 5,
  },
  claRanks: {
    cpt: ["cpt", "tre", "tri", "ltc", "lcc"],
    fo: ["fo", "sfi", "jfo", "so"],
    cc: ["sepe", "sepi", "pu", "jpu", "ju"],
  },
  claTables: {
    pil: {
      tre: {
        basic: 15000 / 13,
        ffp: 79044 / 12,
        sbh: 35870 / 850,
        al: 4785 / 29,
        oob: 160,
        woff: 900,
        allowance: 8000 / 12,
        diaria: 8831 / 190,
        rsa: 51.92,
        itud: 120,
        training: {
          nonBtc: {
            allowance: 6500 / 12,
            simDiaria: [
              { min: 1, max: 999, pay: { ffp: 0, sectorPay: 267.38 } },
            ],
            bonus: { sectorEquivalent: 3 },
          },
          btc: {
            allowance: 7079 / 12,
            bonus: { sectorEquivalent: 3 },
            simDiaria: [
              { min: 1, max: 10, pay: { ffp: 150, sectorPay: 108.83 } },
              { min: 11, max: 999, pay: { ffp: 0, sectorPay: 217.65 } },
            ],
          },
        },
      },
      tri: {
        basic: 15000 / 13,
        ffp: 79044 / 12,
        sbh: 35870 / 850,
        al: 4785 / 29,
        oob: 160,
        woff: 900,
        allowance: 8000 / 12,
        diaria: 8831 / 190,
        rsa: 51.92,
        itud: 120,
        training: {
          nonBtc: {
            allowance: 5079 / 12,
            simDiaria: [
              { min: 1, max: 999, pay: { ffp: 0, sectorPay: 267.38 } },
            ],
            bonus: { sectorEquivalent: 3 },
          },
          btc: {
            allowance: 5079 / 12,
            bonus: { sectorEquivalent: 3 },
            simDiaria: [
              { min: 1, max: 10, pay: { ffp: 150, sectorPay: 108.83 } },
              { min: 11, max: 999, pay: { ffp: 0, sectorPay: 217.65 } },
            ],
          },
        },
      },
      ltc: {
        basic: 15000 / 13,
        ffp: 79044 / 12,
        sbh: 35870 / 850,
        al: 4785 / 29,
        oob: 160,
        woff: 900,
        allowance: 8000 / 12,
        diaria: 8831 / 190,
        rsa: 51.92,
        itud: 120,
        training: {
          allowance: 14000 / 12,
          bonus: {
            pay: [
              { min: 0, max: 21, pay: 0 },
              { min: 22, max: 29, pay: 40 },
              { min: 30, max: 50, pay: 60 },
            ],
            minSectors: 21,
          },
        },
      },
      lcc: {
        basic: 15000 / 13,
        ffp: 79044 / 12,
        sbh: 35870 / 850,
        al: 4785 / 29,
        oob: 160,
        woff: 900,
        allowance: 8000 / 12,
        diaria: 8831 / 190,
        rsa: 51.92,
        itud: 120,
        training: {
          allowance: 5000 / 12,
        },
      },
      cpt: {
        basic: 15000 / 13,
        ffp: 79044 / 12,
        sbh: 35870 / 850,
        al: 4785 / 29,
        oob: 160,
        woff: 900,
        allowance: 8000 / 12,
        diaria: 8831 / 190,
        rsa: 51.92,
        itud: 120,
        training: null,
      },
      sfi: {
        basic: 5000 / 13,
        ffp: 38132 / 12,
        sbh: 15479 / 850,
        al: 3828 / 29,
        oob: 155,
        woff: 450,
        allowance: 7500 / 12,
        diaria: 8831 / 190,
        rsa: 51.92,
        itud: 120,
        training: {
          nonBtc: {
            allowance: 6000 / 12,
            simDiaria: [
              { min: 1, max: 999, pay: { ffp: 0, sectorPay: 100.5 } },
            ],
          },
          btc: {
            allowance: 6000 / 12,
            simDiaria: [
              { min: 1, max: 10, pay: { ffp: 93.75, sectorPay: 61.65 } },
              { min: 11, max: 999, pay: { ffp: 0, sectorPay: 123.3 } },
            ],
          },
        },
      },
      fo: {
        basic: 5000 / 13,
        ffp: 38132 / 12,
        sbh: 15479 / 850,
        al: 3828 / 29,
        oob: 155,
        woff: 450,
        allowance: 7500 / 12,
        diaria: 8831 / 190,
        rsa: 51.92,
        itud: 120,
        training: null,
      },
      jfo: {
        basic: 5000 / 13,
        ffp: 35432 / 12,
        sbh: 13566 / 850,
        al: 3828 / 29,
        oob: 155,
        woff: 450,
        allowance: 7500 / 12,
        diaria: 8831 / 190,
        rsa: 51.92,
        itud: 120,
        training: null,
      },
      so: {
        basic: 5000 / 13,
        ffp: 14698 / 12,
        sbh: 15640 / 850,
        al: 225 / 29,
        oob: 155,
        woff: 138,
        allowance: 7500 / 12,
        diaria: 8831 / 190,
        rsa: 51.92,
        itud: 120,
        training: null,
      },
    },
    cc: {
      sepe: {
        basic: 5000 / 13,
        ffp: 13262.76 / 12,
        sbh: 6.88,
        al: 41.29,
        oob: 28,
        woff: 0,
        allowance: (730 + 2500) / 12,
        diaria: 72.29,
        rsa: 51.92,
        itud: 120,
        training: {
          allowance: 2905 / 12,
          simDiaria: [],
        },
      },
      sepi: {
        basic: 5000 / 13,
        ffp: 13262.76 / 12,
        sbh: 6.88,
        al: 41.29,
        oob: 28,
        woff: 0,
        allowance: (730 + 2500) / 12,
        diaria: 72.29,
        rsa: 52.92,
        itud: 120,
        training: {
          allowance: 1905 / 12,
          simDiaria: [],
        },
      },
      pu: {
        basic: 5000 / 13,
        ffp: 938.5,
        sbh: 6.88,
        al: 41.29,
        oob: 28,
        woff: 0,
        allowance: 60.84 + 208.34,
        diaria: 40,
        rsa: 52.92,
        itud: 120,
        training: null,
      },
      jpu: {
        basic: 307.69,
        ffp: 676.07,
        sbh: 5.7,
        al: 35.03,
        oob: 28,
        woff: 0,
        allowance: 60.84,
        diaria: 40,
        rsa: 52.92,
        itud: 120,
        training: null,
      },
      ju: {
        basic: 230.77,
        ffp: 567.98,
        sbh: 4.69,
        al: 29.06,
        oob: 28,
        woff: 0,
        allowance: 60.84,
        diaria: 40,
        rsa: 52.92,
        itud: 120,
        training: null,
      },
    },
  },
  claCorrection: {
    pil: [
      { date: "2023-04-15", corrections: null },
      {
        date: "2025-04-15",
        corrections: {
          cpt: { ffp: 3000 / 12 },
          fo: { ffp: 1600 / 12 },
        },
      },
      {
        date: "2026-04-15",
        corrections: {
          cpt: { ffp: 3000 / 12 },
          fo: { ffp: 1600 / 12 },
        },
      },
    ],
    cc: [
      { date: "2023-04-15", corrections: null },
      {
        date: "2025-04-15",
        corrections: {
          ju: { ffp: 500 / 12 },
          pu: { ffp: 750 / 12 },
          jpu: { ffp: 750 / 12 },
        },
      },
    ],
  },
};

// Constants
export const MAX_TAX_FREE_DIARIA = 46.48;
export const MAX_CONTRIBUTO_VOLONTARIO_PENSIONE = 5164.56;

// Minimo imponibile INPS per giorno
export const MIN_IMPONIBILE_INPS: Record<number, number> = {
  2024: 56.87,
  2025: 56.87,
};

// INPS Rates
export const INPS_RATES = {
  ivs: 0.0919,
  ivsAdd: 0.0359,
  cigs: 0.003,
  fsta: 0.00167,
  fis: 0.0026667,
  pensionFactor: 0.33,
};

// IRPEF Tax Brackets
export const IRPEF_BRACKETS: Record<number, { limit: number; rate: number }[]> =
  {
    2023: [
      { limit: 15000, rate: 0.23 },
      { limit: 28000, rate: 0.25 },
      { limit: 50000, rate: 0.35 },
      { limit: Infinity, rate: 0.43 },
    ],
    2024: [
      { limit: 28000, rate: 0.23 },
      { limit: 50000, rate: 0.35 },
      { limit: Infinity, rate: 0.43 },
    ],
    2025: [
      { limit: 28000, rate: 0.23 },
      { limit: 50000, rate: 0.35 },
      { limit: Infinity, rate: 0.43 },
    ],
    2026: [
      { limit: 28000, rate: 0.23 },
      { limit: 50000, rate: 0.33 }, // Reduced from 35% to 33% in 2026
      { limit: Infinity, rate: 0.43 },
    ],
  };

// Helper functions
export function getContractData(company: string, role: string, rank: string) {
  if (company !== "RYR") return null;

  // Support both 'pil' and 'pilot' formats
  const roleKey = role === "pilot" || role === "pil" ? "pil" : "cc";
  const companyData =
    RYR_CONFIG.claTables[roleKey as keyof typeof RYR_CONFIG.claTables];
  if (!companyData) return null;

  return companyData[rank.toLowerCase()] || null;
}

export function getActiveCorrections(
  company: string,
  role: string,
  date: string,
): ClaCorrection[] {
  if (company !== "RYR") return [];

  // Support both 'pil' and 'pilot' formats
  const roleKey = role === "pilot" || role === "pil" ? "pil" : "cc";
  const corrections =
    RYR_CONFIG.claCorrection[roleKey as keyof typeof RYR_CONFIG.claCorrection];
  if (!corrections) return [];

  const targetDate = new Date(date);
  return corrections.filter((c) => new Date(c.date) <= targetDate);
}

export function applyCorrections(
  contractData: ReturnType<typeof getContractData>,
  corrections: ClaCorrection[],
  rank: string,
) {
  if (!contractData) return null;

  const corrected = { ...contractData };

  corrections.forEach((correction) => {
    if (!correction.corrections) return;

    const rankCorrection = correction.corrections[rank.toLowerCase()];
    if (rankCorrection) {
      Object.entries(rankCorrection).forEach(([key, value]) => {
        if (value !== undefined && key in corrected) {
          (corrected as any)[key] = (corrected as any)[key] + value;
        }
      });
    }
  });

  return corrected;
}

export function getUnionFee(rank: string, role: string): number {
  const key =
    role === "pilot" || role === "pil"
      ? ["cpt", "tre", "tri", "ltc", "lcc"].includes(rank)
        ? "cpt"
        : "fo"
      : "cc";
  return RYR_CONFIG.unionFees[key as keyof typeof RYR_CONFIG.unionFees] || 0;
}

export function getUnpaidLeaveDays(role: string): number {
  const key = role === "pilot" || role === "pil" ? "pil" : "cc";
  return (
    RYR_CONFIG.unpayedLeaveDays[
      key as keyof typeof RYR_CONFIG.unpayedLeaveDays
    ] || 17
  );
}
