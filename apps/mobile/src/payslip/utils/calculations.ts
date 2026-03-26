// Calculation Helpers for Payslip Calculator

import { PayslipItem, LeaveItem, AdditionalItem, TieredPay } from "../types";

// Create a PayslipItem
export function createPayslipItem(
  total: number,
  taxablePercentage: number = 100,
  quantity: number | null = null,
  isDeduction: boolean = false,
  isSectorPay: boolean = false,
): PayslipItem {
  const taxable = total * (taxablePercentage / 100);
  const taxFree = total - taxable;
  const unit = quantity && quantity > 0 ? total / quantity : null;

  return {
    total,
    taxable,
    taxFree,
    isDeduction,
    quantity,
    unit,
    isSectorPay,
  };
}

// Create a LeaveItem
export function createLeaveItem(
  basicQuota: number,
  ffpQuota: number,
  days: number,
): LeaveItem {
  return {
    basicQuota: createPayslipItem(basicQuota, 100, days, true),
    ffpQuota: createPayslipItem(ffpQuota, 50, days, true),
    total: createPayslipItem(basicQuota + ffpQuota, 100, days, true),
  };
}

// Create an AdditionalItem
export function createAdditionalItem(
  amount: number,
  taxPercentage: number,
  isSLR: boolean = false,
  isConguaglio: boolean = false,
): AdditionalItem {
  const taxable = amount * (taxPercentage / 100);
  const taxFree = amount - taxable;

  return {
    total: amount,
    taxable,
    taxFree,
    isSLR,
    isConguaglio,
  };
}

// Calculate tiered pay (for LTC training bonus)
export function calculateTieredPay(value: number, tiers: TieredPay[]): number {
  const sortedTiers = [...tiers].sort((a, b) => a.min - b.min);
  let totalPay = 0;
  let remainingValue = value;

  for (const tier of sortedTiers) {
    if (remainingValue <= 0) break;

    const tierRange = tier.max - tier.min + 1;
    const valueInTier = Math.min(remainingValue, tierRange);

    if (valueInTier > 0) {
      totalPay += valueInTier * tier.pay;
      remainingValue -= valueInTier;
    }
  }

  return totalPay;
}

// Calculate sim diaria pay
export function calculateSimDiariaPay(
  days: number,
  tiers: {
    min: number;
    max: number;
    pay: { ffp: number; sectorPay: number };
  }[],
): { ffp: number; sectorPay: number } {
  const sortedTiers = [...tiers].sort((a, b) => a.min - b.min);
  let totalFfp = 0;
  let totalSectorPay = 0;

  for (const tier of sortedTiers) {
    if (days >= tier.min) {
      const daysAtRate = Math.min(days, tier.max) - tier.min + 1;
      totalFfp += daysAtRate * tier.pay.ffp;
      totalSectorPay += daysAtRate * tier.pay.sectorPay;
    }
  }

  return { ffp: totalFfp, sectorPay: totalSectorPay };
}

// Calculate diaria with tax-free portion
export function calculateDiariaWithTaxFree(
  days: number,
  rate: number,
  maxTaxFree: number = 46.48,
): { total: number; taxable: number; taxFree: number } {
  const total = days * rate;
  const taxFreePerDay = Math.min(rate, maxTaxFree);
  const taxFree = days * taxFreePerDay;
  const taxable = total - taxFree;

  return { total, taxable, taxFree };
}

// Sum values of an object
export function sumValues(obj: Record<string, number>): number {
  return Object.values(obj).reduce((sum, val) => sum + val, 0);
}

// Calculate tax brackets
export function calculateTaxBrackets(
  annualIncome: number,
  brackets: { limit: number; rate: number }[],
): number {
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    const limit = bracket.limit === Infinity ? annualIncome : bracket.limit;

    if (annualIncome > limit) {
      tax += (limit - previousLimit) * bracket.rate;
      previousLimit = limit;
    } else {
      tax += (annualIncome - previousLimit) * bracket.rate;
      break;
    }
  }

  return tax / 12; // Monthly
}

// Calculate work deductions (detrazioni lavoro dipendente)
export function calculateWorkDeductions(
  annualIncome: number,
  year: number,
  date: Date,
): number {
  let detrazione = 0;

  if (annualIncome <= 15000) {
    detrazione = 1955;
  } else if (annualIncome <= 28000) {
    detrazione = 1910 + 1190 * ((28000 - annualIncome) / 13000);
  } else if (annualIncome <= 50000) {
    detrazione = 1910 * ((50000 - annualIncome) / 22000);
  }

  // Bonus 65 euro only for 2024
  if (year === 2024 && annualIncome >= 25000 && annualIncome <= 35000) {
    detrazione += 65;
  }

  return detrazione / 365; // Daily
}

// Calculate spouse deductions
export function calculateSpouseDeductions(
  annualIncome: number,
  year: number,
): number {
  if (year >= 2025) return 0; // Abolished from 2025

  let detrazione = 0;

  if (annualIncome <= 15000) {
    detrazione = 800 - (110 * annualIncome) / 15000;
  } else if (annualIncome <= 29000) {
    detrazione = 690;
  } else if (annualIncome <= 29200) {
    detrazione = 700;
  } else if (annualIncome <= 34700) {
    detrazione = 710;
  } else if (annualIncome <= 35000) {
    detrazione = 720;
  } else if (annualIncome <= 35100) {
    detrazione = 710;
  } else if (annualIncome <= 35200) {
    detrazione = 700;
  } else if (annualIncome <= 40000) {
    detrazione = 690;
  } else if (annualIncome <= 80000) {
    detrazione = 690 * ((80000 - annualIncome) / 40000);
  }

  return detrazione / 12; // Monthly
}

// Calculate cuneo fiscale (tax cut)
export function calculateCuneoFiscale(
  monthlyIncome: number,
  year: number,
): { percentage: number; amount: number } {
  if (monthlyIncome <= 0) return { percentage: 0, amount: 0 };
  const annualIncome = monthlyIncome * 12;

  if (year === 2024) {
    if (monthlyIncome <= 1923) {
      return { percentage: 0.07, amount: monthlyIncome * 0.07 };
    } else if (monthlyIncome <= 2692) {
      return { percentage: 0.06, amount: monthlyIncome * 0.06 };
    }
  } else if (year >= 2025) {
    if (annualIncome <= 8500) {
      return { percentage: 0.071, amount: monthlyIncome * 0.071 };
    } else if (annualIncome <= 15000) {
      return { percentage: 0.053, amount: monthlyIncome * 0.053 };
    } else if (annualIncome <= 20000) {
      return { percentage: 0.048, amount: monthlyIncome * 0.048 };
    } else if (annualIncome <= 32000) {
      const amount = 1000 / 12;
      return { percentage: amount / monthlyIncome, amount };
    } else if (annualIncome <= 40000) {
      const detrazioneDecalage = (1000 * (40000 - annualIncome)) / 8000;
      const amount = detrazioneDecalage / 12;
      return { percentage: amount / monthlyIncome, amount };
    }
  }

  return { percentage: 0, amount: 0 };
}

// Calculate IVS exemption
export function calculateIVSExemption(
  monthlyIncome: number,
  year: number,
): { percentage: number; amount: number; concorreImponibileIRPEF: boolean } {
  // Same as cuneo fiscale for 2024, none for 2025
  if (year === 2024) {
    const cuneo = calculateCuneoFiscale(monthlyIncome, year);
    return { ...cuneo, concorreImponibileIRPEF: true };
  }
  return { percentage: 0, amount: 0, concorreImponibileIRPEF: false };
}

// Calculate bonus (trattamento integrativo)
export function calculateBonus(
  annualIncome: number,
  impostaLorda: number,
  detrazioni: number,
  date: Date,
): number {
  if (annualIncome > 28000) return 0;

  if (annualIncome <= 15000) {
    return impostaLorda > detrazioni ? 1200 / 365 : 0;
  }

  return 0;
}
