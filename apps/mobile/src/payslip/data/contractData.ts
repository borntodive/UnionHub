// Contract Data for Ryanair (RYR)
// Based on PAYSLIP_CALCULATOR_EXPO_SPEC.md

export const RYR_CONFIG = {
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
};

// Constants
export const MAX_TAX_FREE_DIARIA = 46.48;
export const MAX_CONTRIBUTO_VOLONTARIO_PENSIONE = 5164.56;

// Minimale contributivo giornaliero INPS (minimale retributivo lavoratori dipendenti).
// Base: max(PAGA BASE + IND.VOLO, minimaleGiornaliero × giorni INPS).
// Il valore di 312,32/gg sulla busta TRI era la retribuzione effettiva, non il minimale.
// 2026: 58,13 €/gg (confermato dall'utente)
// 2024–2025: stime — da verificare con circolari INPS
export const MIN_IMPONIBILE_INPS: Record<number, number> = {
  2024: 56.87, // stima — da verificare con circolare INPS 2024
  2025: 57.52, // stima — da verificare con circolare INPS 2025
  2026: 58.13, // confermato
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
