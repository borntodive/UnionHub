// Payslip Calculator Service
// Main calculation engine based on PAYSLIP_CALCULATOR_EXPO_SPEC.md

import {
  PayslipInput,
  PayslipSettings,
  Payslip,
  Payroll,
  PayslipItem,
  LeaveItem,
  INPS,
  IRPEF,
  AdditionalItem,
  UserContext,
  DebugContractRates,
} from "../types";
import {
  getUnionFee,
  getUnpaidLeaveDays,
  RYR_CONFIG,
  MAX_TAX_FREE_DIARIA,
  INPS_RATES,
  IRPEF_BRACKETS,
  MIN_IMPONIBILE_INPS,
} from "../data/contractData";
import {
  createPayslipItem,
  createLeaveItem,
  createAdditionalItem,
  calculateTieredPay,
  calculateSimDiariaPay,
  calculateDiariaWithTaxFree,
  sumValues,
  calculateTaxBrackets,
  calculateWorkDeductions,
  calculateSpouseDeductions,
  calculateCuneoFiscale,
  calculateIVSExemption,
  calculateBonus,
} from "../utils/calculations";
import { parseSbh, isDecember, getYear } from "../utils/formatters";
import {
  getSeniorityDate,
  computeSeniorityYears,
  findSeniorityBracket,
  applySeniorityBracket,
} from "../utils/seniority";

export class PayslipCalculator {
  private contractData: any | null;
  private input: PayslipInput;
  private settings: PayslipSettings;
  private userFlags: UserContext;
  private year: number;
  private month: number;
  public seniorityYears: number = 0;

  constructor(
    input: PayslipInput,
    settings: PayslipSettings,
    userFlags: UserContext = {},
  ) {
    this.input = input;
    this.settings = settings;
    this.userFlags = userFlags;
    this.year = getYear(input.date);
    this.month = new Date(input.date).getMonth() + 1;

    // Contract data comes from DB/cache via UserContext (no static fallback)
    const baseData = userFlags.liveContractData ?? null;
    if (baseData) {
      // Live data is already corrected for the date — no static corrections needed
      const corrected = baseData;

      // Apply seniority bracket if user context and brackets are available
      let withBracket = corrected;
      const seniorityDate = getSeniorityDate(userFlags);
      if (seniorityDate) {
        const years = computeSeniorityYears(seniorityDate, input.date);
        this.seniorityYears = years;
        const brackets =
          userFlags.seniorityBrackets ?? corrected.seniorityBrackets;
        if (brackets && brackets.length > 0) {
          const bracket = findSeniorityBracket(brackets, years);
          if (bracket) {
            withBracket = applySeniorityBracket(corrected, bracket);
          }
        }
      }

      // Apply legacy contract overrides
      if (settings.legacy) {
        const lc = settings.legacyCustom;
        const ld = settings.legacyDeltas;
        if (settings.legacyDirect && lc) {
          // Override mode: use custom values directly as contract rates
          this.contractData = {
            ...withBracket,
            ffp: lc.ffp > 0 ? lc.ffp : withBracket.ffp,
            sbh: lc.sbh > 0 ? lc.sbh : withBracket.sbh,
            al: lc.al > 0 ? lc.al : withBracket.al,
          };
        } else if (ld) {
          // General settings mode: apply saved deltas on top of current contract
          this.contractData = {
            ...withBracket,
            ffp: withBracket.ffp + ld.ffp,
            sbh: withBracket.sbh + ld.sbh,
            al: withBracket.al + ld.al,
          };
        } else {
          this.contractData = withBracket;
        }
      } else {
        this.contractData = withBracket;
      }
    } else {
      this.contractData = null;
    }
  }

  async calculatePayroll(): Promise<Payroll | null> {
    if (!this.contractData) return null;

    const payslipItems = this.calculatePayslipItems();
    const sectorPay = this.calculateSectorPay(payslipItems);
    const { taxArea, taxFreeArea, grossPay } =
      this.calculateTaxAreas(payslipItems);

    const areaINPS = this.calculateINPS(taxArea);
    const tfr = this.calculateTFR(payslipItems, areaINPS.imponibile);
    const fondoPensione = this.calculateFondoPensione(tfr.retribuzioneUtileTFR);

    const areaIRPEF = this.calculateIRPEF(
      taxArea,
      areaINPS,
      payslipItems.additionalPayments,
      payslipItems.union.total,
      fondoPensione,
    );

    // Add pension fund to IRPEF
    areaIRPEF.fondoPensione = fondoPensione;
    areaIRPEF.retribuzioneUtileTFR = tfr.retribuzioneUtileTFR;
    areaIRPEF.tfr = tfr.tfr;

    // Italian payslip format: deductions show IMPOSTA LORDA in TRATTENUTE;
    // detrazioni (lavoro, coniuge) and cuneo appear as positive credits in COMPETENZE.
    const totaleCompetenze =
      grossPay +
      areaINPS.esenzioneIVS.amount +
      areaIRPEF.trattamentoIntegrativo +
      areaIRPEF.detrazioniLavoroDipendente +
      areaIRPEF.detrazioneConiuge +
      areaIRPEF.taglioCuneoFiscale.amount;

    const totaleTrattenute =
      areaINPS.contribuzioneTotale +
      areaIRPEF.lordo +
      areaIRPEF.fondoPensione.volontaria +
      areaIRPEF.fondoPensione.fondAer +
      areaIRPEF.addizionaliRegionali +
      areaIRPEF.addizionaliComunali +
      areaIRPEF.accontoAddizionaliComunali +
      payslipItems.union.total;

    const netPayment = totaleCompetenze - totaleTrattenute;

    const debugRates = this.buildDebugRates();

    return {
      payslipItems,
      sectorPay,
      taxArea,
      taxFreeArea,
      grossPay,
      areaINPS,
      areaIRPEF,
      netPayment,
      totaleCompetenze,
      totaleTrattenute,
      debugRates,
    };
  }

  private calculatePayslipItems(): Payslip {
    const cd = this.contractData!;

    // Part-time percentage (1 = full time, 0.5 = 50%, etc.)
    const ptPct = this.settings.parttime ? this.settings.parttimePercentage : 1;

    // New Captain reduction (10% reduction on most items, except diaria/oob/allowances)
    const cuPct = this.settings.cu ? 0.9 : 1;

    // Basic (reduced by part-time AND New Captain if applicable)
    const basicAmount = cd.basic * ptPct * cuPct;
    const basic = createPayslipItem(basicAmount, 100, cd.basicDays || 1);

    // 13th Month (only December, also reduced by part-time and New Captain)
    const basic13th = isDecember(this.input.date)
      ? createPayslipItem(basicAmount, 100)
      : createPayslipItem(0, 100);

    // FFP components - calculate separately for display
    const ffpResult = this.calculateFFPComponents(ptPct, cuPct);
    const ffp = createPayslipItem(ffpResult.base, 50);
    const ffpAllowance = createPayslipItem(ffpResult.allowance, 50);
    const ffpTraining = createPayslipItem(ffpResult.trainingMain, 50);
    const ffpTrainingLtc = createPayslipItem(ffpResult.trainingLtc, 50);

    // Diaria
    const flyDiariaData = calculateDiariaWithTaxFree(
      this.input.flyDiaria,
      cd.diaria,
      MAX_TAX_FREE_DIARIA,
    );
    const flyDiaria: PayslipItem = {
      total: flyDiariaData.total,
      taxable: flyDiariaData.taxable,
      taxFree: flyDiariaData.taxFree,
      isDeduction: false,
      quantity: this.input.flyDiaria,
      unit: cd.diaria,
      isSectorPay: false,
    };

    const noFlyDiaria = createPayslipItem(
      this.input.noFlyDiaria * cd.diaria,
      100,
      this.input.noFlyDiaria,
    );

    // AL (reduced by New Captain) — 50% imponibile come indennità di volo (art. 51 c.6 TUIR)
    const al = createPayslipItem(
      this.input.al * cd.al * cuPct,
      50,
      this.input.al,
    );

    // WOFF (pilots only, reduced by New Captain)
    const woff = cd.woff
      ? createPayslipItem(
          cd.woff * this.input.woff * cuPct,
          50,
          this.input.woff,
        )
      : createPayslipItem(0, 50);

    // OOB (NOT reduced by New Captain)
    const oob = createPayslipItem(this.input.oob * cd.oob, 100, this.input.oob);

    // RSA (only if user has RSA flag enabled, NOT reduced by New Captain)
    const rsa = this.userFlags.rsa
      ? createPayslipItem(cd.rsa, 100)
      : createPayslipItem(0, 100);

    // OOB Unplanned (CC only)
    const oobUnplanned = cd.oob
      ? createPayslipItem(
          this.input.oobUnplanned * cd.oob,
          100,
          this.input.oobUnplanned,
        )
      : createPayslipItem(0, 100);

    // UL (Unpaid Leave)
    const ul = this.calculateLeave(
      this.input.ul,
      basic.total,
      ffp.total,
      false,
    );

    // Sim Pay (reduced by New Captain)
    const simPay = createPayslipItem(
      this.calculateSimPay() * cuPct,
      50,
      this.input.simDays,
    );

    // Training Pay (LTC only, reduced by New Captain)
    const trainingPay = createPayslipItem(
      this.calculateTrainingPay() * cuPct,
      50,
      this.input.trainingSectors,
    );

    // Parental Leave
    const parentalLeave = this.calculateLeave(
      this.input.parentalDays,
      basic.total,
      ffp.total,
      true,
    );

    // Leave 104
    const leave104 = this.calculateLeave(
      this.input.days104,
      basic.total,
      ffp.total,
      true,
    );

    // SBH
    const sbhDecimal = parseSbh(this.input.sbh);
    const sbh = createPayslipItem(sbhDecimal * cd.sbh, 50, sbhDecimal);

    // ITUD - use contract value or default 120
    const itudRate = cd.itud || 120;
    const itud = createPayslipItem(
      this.input.itud * itudRate,
      50,
      this.input.itud,
    );

    // Additional Payments
    // tax=999 is a UI sentinel for "conguaglio" — cap at 100% for INPS computation
    const additionalPayments = this.input.additional.map((add) =>
      createAdditionalItem(
        add.amount,
        add.tax > 100 ? 100 : add.tax,
        add.isSLR,
        add.isConguaglio,
      ),
    );

    // Additional Deductions
    const additionalDeductions = this.input.additionalDeductions.map((ded) =>
      createAdditionalItem(
        ded.amount,
        ded.tax > 100 ? 100 : ded.tax,
        false,
        ded.isConguaglio,
      ),
    );

    // Union Fee (positive value, will be subtracted in tax calculation)
    const unionFee = getUnionFee(this.settings.rank, this.settings.role);
    const union = createPayslipItem(unionFee, 0, 1, true);

    // Commissions
    // Commissions (reduced by New Captain)
    const commissions = createPayslipItem(this.input.commissions * cuPct, 100);

    // Bank Holidays (CC only)
    const bankHolydays = createPayslipItem(
      this.input.bankHolydays * cd.al,
      50,
      this.input.bankHolydays,
    );

    // CC Training (reduced by New Captain)
    const ccTraining = createPayslipItem(
      this.input.ccTrainingDays * (cd.training?.allowance || 0) * cuPct,
      50,
      this.input.ccTrainingDays,
    );

    return {
      basic,
      basic13th,
      ffp,
      ffpAllowance,
      ffpTraining,
      ffpTrainingLtc,
      flyDiaria,
      noFlyDiaria,
      ccTraining,
      al,
      woff,
      oob,
      rsa,
      oobUnplanned,
      ul,
      simPay,
      trainingPay,
      parentalLeave,
      leave104,
      sbh,
      itud,
      additionalPayments,
      additionalDeductions,
      union,
      commissions,
      bankHolydays,
    };
  }

  private calculateFFPComponents(
    partTimePct: number = 1,
    cuPct: number = 1,
  ): {
    base: number;
    allowance: number;
    trainingMain: number;
    trainingLtc: number;
  } {
    const cd = this.contractData!;

    // Base FFP (reduced by part-time and New Captain)
    const base = cd.ffp * partTimePct * cuPct;

    // Monthly allowance (NOT reduced)
    let allowance = cd.allowance || 0;

    // Rank-specific training allowance (NOT reduced by part-time or New Captain)
    let trainingMain = 0;

    // Training allowance for the rank
    if (cd.training?.allowance) {
      trainingMain += cd.training.allowance;
    }

    // Instructor allowance (SFI/TRI/TRE)
    if (this.isInstructor() && cd.training) {
      const trainingConfig = cd.training;
      if (this.settings.btc && trainingConfig.btc) {
        trainingMain += trainingConfig.btc.allowance;
      } else if (trainingConfig.nonBtc) {
        trainingMain += trainingConfig.nonBtc.allowance;
      }
    }

    // LTC additional allowance for TRI acting as LTC, or TRE (always has LTC component).
    // This is kept separate so it can be displayed as a distinct row in the results.
    let trainingLtc = 0;
    const isLtc = this.settings.rank === "tre" || this.settings.triAndLtc;
    if (isLtc) {
      const ltcData = this.userFlags.ltcContractData ?? null;
      if (ltcData?.training?.allowance) {
        trainingLtc += ltcData.training.allowance;
      }
    }

    return { base, allowance, trainingMain, trainingLtc };
  }

  private calculateSimPay(): number {
    if (!this.isInstructor() || !this.contractData?.training) return 0;

    const training = this.contractData.training;
    let simDiaria: {
      min: number;
      max: number;
      pay: { ffp: number; sectorPay: number };
    }[] = [];

    if (this.settings.btc && training.btc) {
      simDiaria = training.btc.simDiaria;
    } else if (training.nonBtc) {
      simDiaria = training.nonBtc.simDiaria;
    }

    if (simDiaria.length === 0) return 0;

    const { sectorPay } = calculateSimDiariaPay(this.input.simDays, simDiaria);
    return sectorPay;
  }

  private calculateTrainingPay(): number {
    if (!this.settings.triAndLtc || !this.contractData?.training?.bonus?.pay) {
      return 0;
    }

    let sectors = this.input.trainingSectors;

    // Add sector equivalent from sim days
    if (this.contractData.training.bonus.sectorEquivalent) {
      sectors += Math.floor(
        this.input.simDays / this.contractData.training.bonus.sectorEquivalent,
      );
    }

    return calculateTieredPay(sectors, this.contractData.training.bonus.pay);
  }

  private calculateLeave(
    days: number,
    basic: number,
    ffp: number,
    isStatutory: boolean,
  ): LeaveItem {
    if (days === 0) {
      return {
        basicQuota: createPayslipItem(0, 100, 0, true),
        ffpQuota: createPayslipItem(0, 50, 0, true),
        total: createPayslipItem(0, 100, 0, true),
      };
    }

    if (isStatutory) {
      // Statutory leave: divided by 26 (contractual working days convention)
      const basicQuota = (basic * days) / 26;
      const ffpQuota = (ffp * days) / 26;
      return createLeaveItem(basicQuota, ffpQuota, days);
    } else {
      // Contractual leave: based on contract unpaid leave days
      const ulDays = getUnpaidLeaveDays(this.settings.role);
      const basicQuota = ((basic + basic / 12) * days) / ulDays;
      const ffpQuota = (ffp * days) / ulDays;
      return createLeaveItem(basicQuota, ffpQuota, days);
    }
  }

  private calculateSectorPay(payslip: Payslip): PayslipItem {
    // Sector pay is typically FFP / 12 as an approximation
    const sectorPayAmount = payslip.ffp.total / 12;
    return createPayslipItem(sectorPayAmount, 50, null, false, true);
  }

  private calculateTaxAreas(payslip: Payslip): {
    taxArea: number;
    taxFreeArea: number;
    grossPay: number;
  } {
    let taxArea = 0;
    let taxFreeArea = 0;

    // Sum all payslip items
    const items = [
      payslip.basic,
      payslip.basic13th,
      payslip.ffp,
      payslip.ffpAllowance, // IV — voce 1041, 50% imponibile art.51 TUIR
      payslip.ffpTraining, // TRI/LTC/SFI/TRE training — 50% imponibile
      payslip.ffpTrainingLtc, // LTC component su TRE/triAndLtc — 50% imponibile
      payslip.flyDiaria,
      payslip.noFlyDiaria,
      payslip.ccTraining,
      payslip.al,
      payslip.woff,
      payslip.oob,
      payslip.rsa,
      payslip.oobUnplanned,
      payslip.simPay,
      payslip.trainingPay,
      payslip.sbh,
      payslip.itud,
      payslip.commissions,
      payslip.bankHolydays,
      payslip.parentalLeave.total,
      payslip.leave104.total,
      ...payslip.additionalPayments.map((ap) => ({
        total: ap.total,
        taxable: ap.taxable,
        isDeduction: false,
      })),
    ];

    for (const item of items) {
      if ("isDeduction" in item && item.isDeduction) continue;

      const total = item.total;
      const taxable = "taxable" in item ? item.taxable : total;

      taxArea += taxable;
      taxFreeArea += total - taxable;
    }

    // Subtract deductions that reduce both INPS and IRPEF bases
    // NOTE: union fee is intentionally excluded here — it does NOT reduce
    //       INPS imponibile (art. 23 DPR 600/73). It is subtracted only in
    //       calculateIRPEF() where it reduces the IRPEF taxable base.
    taxArea -= payslip.ul.total.total;
    taxArea -= payslip.parentalLeave.total.total;
    taxArea -= payslip.leave104.total.total;
    for (const ded of payslip.additionalDeductions) {
      taxArea -= ded.total;
    }

    return { taxArea, taxFreeArea, grossPay: taxArea + taxFreeArea };
  }

  // taxArea = area imponibile IRPEF (tutti gli item al loro % tassabile).
  // La base INPS è max(taxArea, minimaleGiornaliero × GG_INPS).
  private calculateINPS(taxArea: number): INPS {
    const minDailyAmount = MIN_IMPONIBILE_INPS[this.year] ?? 58.13;
    const minImponibile = minDailyAmount * this.input.inpsDays;

    const imponibile = Math.max(taxArea, minImponibile);
    // INPS contributions are computed on the rounded imponibile; the raw
    // (non-rounded) imponibile is used when deriving the IRPEF taxable base.
    const imponibileArrotondato = Math.round(imponibile);

    const contribuzione = {
      ivs: imponibileArrotondato * INPS_RATES.ivs,
      ivsAdd: imponibileArrotondato * INPS_RATES.ivsAdd,
      fis: imponibileArrotondato * INPS_RATES.fis,
      cigs: imponibileArrotondato * INPS_RATES.cigs,
      fsta: imponibileArrotondato * INPS_RATES.fsta,
    };

    const contribuzioneTotale = sumValues(contribuzione);
    const esenzioneIVS = calculateIVSExemption(imponibile, this.year);

    return {
      imponibile,
      imponibileArrotondato,
      taxArea,
      minimoImponibile: minImponibile,
      contribuzione,
      contribuzioneTotale,
      pensionAcc: imponibile * INPS_RATES.pensionFactor,
      esenzioneIVS: {
        percentage: esenzioneIVS.percentage,
        amount: esenzioneIVS.amount,
        concorreImponibileIRPEF: esenzioneIVS.concorreImponibileIRPEF,
      },
    };
  }

  private calculateIRPEF(
    taxArea: number,
    inps: INPS,
    additionalPayments: AdditionalItem[],
    unionFee: number,
    fondoPensione: { volontaria: number; fondAer: number },
  ): IRPEF {
    const inpsContribution = inps.contribuzioneTotale;

    // Calculate SLR payments
    const slrPayments = additionalPayments
      .filter((ap) => ap.isSLR)
      .reduce((sum, ap) => sum + ap.total, 0);

    // Taxable income after INPS and pension fund contributions.
    // Pension fund (art. 8 d.lgs. 252/2005) is deducted by the employer in payslip.
    // Union fee (art. 10 TUIR) is an "onere deducibile" claimed by the employee in the
    // annual tax return — the withholding agent does NOT deduct it here.
    const pensionEmployee = fondoPensione.volontaria + fondoPensione.fondAer;
    const imponibile =
      taxArea - inpsContribution + slrPayments - pensionEmployee;

    // Annual projection
    const annualIncome = imponibile * 12;

    // Progressive (YTD) annual base: if the user supplied IMP.FISC.PROG,
    // project annual income with the 13-month factor (months 1–11) or 12 (December).
    // This matches the SAP cumulative withholding method used in real payslips.
    let annualBaseOverride: number | undefined;
    if (this.input.pregressoIrpef > 0) {
      const factor = this.month === 12 ? 12 : 13;
      annualBaseOverride = (this.input.pregressoIrpef / this.month) * factor;
    }

    // Calculate gross tax (always on standard monthly projection)
    const brackets = IRPEF_BRACKETS[this.year] || IRPEF_BRACKETS[2024];
    const irpefLorda = calculateTaxBrackets(annualIncome, brackets);

    // Deductions — use progressive base when available (already returns monthly amount)
    const inputDate = new Date(this.input.date);
    const detrazioniLavoro =
      annualBaseOverride != null
        ? calculateWorkDeductions(
            annualIncome,
            this.year,
            inputDate,
            annualBaseOverride,
          )
        : calculateWorkDeductions(annualIncome, this.year, inputDate) * 30;

    const detrazioniConiuge = this.settings.coniugeCarico
      ? calculateSpouseDeductions(annualIncome, this.year)
      : 0;

    // Tax cut — use progressive base when available
    const taglioCuneo = calculateCuneoFiscale(
      imponibile,
      this.year,
      annualBaseOverride,
      annualBaseOverride != null ? inputDate : undefined,
    );

    // Net tax
    const ritenute = Math.max(
      0,
      irpefLorda - detrazioniLavoro - detrazioniConiuge - taglioCuneo.amount,
    );

    // Average tax rate
    const aliquotaMedia = imponibile > 0 ? ritenute / imponibile : 0;

    // Bonus
    const trattamentoIntegrativo = calculateBonus(
      annualIncome,
      irpefLorda,
      detrazioniLavoro + detrazioniConiuge,
      new Date(this.input.date),
    );

    return {
      imponibile,
      lordo: irpefLorda,
      detrazioniLavoroDipendente: detrazioniLavoro,
      ritenute,
      aliquotaMedia,
      trattamentoIntegrativo,
      taglioCuneoFiscale: taglioCuneo,
      fondoPensione: { totale: 0, volontaria: 0, aziendale: 0, fondAer: 0 }, // Will be set later
      addizionaliComunali: this.settings.addComunali,
      accontoAddizionaliComunali: this.settings.accontoAddComunali,
      addizionaliRegionali: this.settings.addRegionali,
      detrazioneConiuge: detrazioniConiuge,
      retribuzioneUtileTFR: 0, // Will be set later
      tfr: 0, // Will be set later
    };
  }

  private calculateTFR(
    payslip: Payslip,
    imponibileINPS: number,
  ): { retribuzioneUtileTFR: number; tfr: number } {
    const retribuzioneUtileTFR =
      payslip.basic.total +
      payslip.ffp.total +
      payslip.ffpAllowance.total +
      payslip.ffpTraining.total +
      payslip.ffpTrainingLtc.total +
      payslip.basic13th.total +
      payslip.noFlyDiaria.total +
      payslip.rsa.total +
      payslip.additionalPayments
        .filter((ap) => !ap.isConguaglio)
        .reduce((sum, ap) => sum + ap.total, 0) -
      payslip.ul.basicQuota.total -
      payslip.ul.ffpQuota.total;

    // TFR = (RUT / 13.5) - (INPS imponibile * 0.5%)
    const tfr = retribuzioneUtileTFR / 13.5 - imponibileINPS * 0.005;

    return { retribuzioneUtileTFR, tfr };
  }

  private calculateFondoPensione(retribuzioneUtileTFR: number): {
    totale: number;
    volontaria: number;
    aziendale: number;
    fondAer: number;
  } {
    const volontaria =
      (retribuzioneUtileTFR * this.settings.voluntaryPensionContribution) / 100;

    // Company contribution: 2% if voluntary >= 2%, otherwise 0
    const maxAziendale = RYR_CONFIG.maxContributoAziendaleTfr; // 2%
    const percAziendale =
      this.settings.voluntaryPensionContribution >= maxAziendale
        ? maxAziendale
        : 0;
    const aziendale = (retribuzioneUtileTFR * percAziendale) / 100;

    // FondAer: mandatory aviation-sector employee contribution (CCNL Aviazione)
    const fondAer = this.settings.fondAer
      ? retribuzioneUtileTFR * RYR_CONFIG.fondAerRate
      : 0;

    return {
      totale: volontaria + aziendale + fondAer,
      volontaria,
      aziendale,
      fondAer,
    };
  }

  private buildDebugRates(): DebugContractRates | undefined {
    const rank = this.settings.rank;
    if (!["ltc", "tri", "tre", "sfi"].includes(rank)) return undefined;

    const cd = this.contractData!;
    const trainingAllowance = cd.training?.allowance ?? 0;

    let instructorAllowance = 0;
    if (this.isInstructor() && cd.training) {
      if (this.settings.btc && cd.training.btc) {
        instructorAllowance = cd.training.btc.allowance ?? 0;
      } else if (cd.training.nonBtc) {
        instructorAllowance = cd.training.nonBtc.allowance ?? 0;
      }
    }

    const result: DebugContractRates = {
      rank,
      mainContract: {
        ffp: cd.ffp ?? 0,
        basic: cd.basic ?? 0,
        trainingAllowance,
        instructorAllowance,
      },
    };

    const ltcData = this.userFlags.ltcContractData ?? null;
    if (ltcData) {
      result.ltcContract = {
        ffp: ltcData.ffp ?? 0,
        trainingAllowance: ltcData.training?.allowance ?? 0,
      };
    }

    return result;
  }

  private isInstructor(): boolean {
    return ["sfi", "tri", "tre"].includes(this.settings.rank);
  }
}

// Factory function
export async function calculatePayroll(
  input: PayslipInput,
  settings: PayslipSettings,
  userFlags: UserContext = {},
): Promise<Payroll | null> {
  const calculator = new PayslipCalculator(input, settings, userFlags);
  return calculator.calculatePayroll();
}
