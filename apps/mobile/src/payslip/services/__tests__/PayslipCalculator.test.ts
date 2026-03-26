import { PayslipCalculator, calculatePayroll } from "../PayslipCalculator";
import { PayslipInput, PayslipSettings } from "../../types";

// CPT contract values (from contractData.ts)
// Note: for dates >= 2025-04-15, a CLA correction adds 3000/12 = 250 to CPT FFP
const CPT_BASIC = 15000 / 13; // ~1153.85
const CPT_FFP_BASE = 79044 / 12; // ~6587.00
const CPT_FFP_CORRECTION = 3000 / 12; // +250 (correction active from 2025-04-15)
const CPT_FFP = CPT_FFP_BASE + CPT_FFP_CORRECTION; // ~6837.00 (post-correction)
const CPT_ALLOWANCE = 8000 / 12; // ~666.67
const CPT_FFP_TOTAL = CPT_FFP + CPT_ALLOWANCE; // ~7503.67
const CPT_OOB = 160;
const CPT_AL = 4785 / 29; // ~165.00

// FO contract values
const FO_BASIC = 5000 / 13; // ~384.62
const FO_FFP = 38132 / 12; // ~3177.67
const FO_ALLOWANCE = 7500 / 12; // ~625.00

const defaultSettings: PayslipSettings = {
  company: "RYR",
  role: "pil",
  rank: "cpt",
  base: "BGY",
  union: 40,
  parttime: false,
  parttimePercentage: 1,
  coniugeCarico: false,
  prevMonthLeavePayment: false,
  tfrContribution: 0,
  addComunali: 0,
  accontoAddComunali: 0,
  addRegionali: 0,
  legacy: false,
  legacyCustom: { ffp: 0, sbh: 0, al: 0 },
  legacyDeltas: { ffp: 0, sbh: 0, al: 0 },
  triAndLtc: false,
  btc: false,
  cu: false,
  voluntaryPensionContribution: 0,
};

const defaultInput: PayslipInput = {
  date: "2025-05-01",
  sbh: "0:00",
  flyDiaria: 0,
  noFlyDiaria: 0,
  onlyNationalFly: 0,
  al: 0,
  woff: 0,
  oob: 0,
  ul: 0,
  additional: [],
  additionalDeductions: [],
  parentalDays: 0,
  days104: 0,
  trainingSectors: 0,
  simDays: 0,
  itud: 0,
  oobUnplanned: 0,
  ccTrainingDays: 0,
  pregressoIrpef: 0,
  commissions: 0,
  landingInOffDay: 0,
  bankHolydays: 0,
  inpsDays: 26,
};

describe("PayslipCalculator", () => {
  describe("basic calculation", () => {
    it("returns a Payroll object for a valid CPT input", async () => {
      const calc = new PayslipCalculator(defaultInput, defaultSettings);
      const result = await calc.calculatePayroll();

      expect(result).not.toBeNull();
      expect(result!.netPayment).toBeDefined();
      expect(typeof result!.netPayment).toBe("number");
    });

    it("returns null for an unknown company", async () => {
      const settings = { ...defaultSettings, company: "UNKNOWN" };
      const calc = new PayslipCalculator(defaultInput, settings);
      const result = await calc.calculatePayroll();

      expect(result).toBeNull();
    });

    it("sets basic pay correctly for CPT", async () => {
      const calc = new PayslipCalculator(defaultInput, defaultSettings);
      const result = await calc.calculatePayroll();

      expect(result!.payslipItems.basic.total).toBeCloseTo(CPT_BASIC, 1);
    });

    it("sets FFP total correctly for CPT (ffp + allowance)", async () => {
      const calc = new PayslipCalculator(defaultInput, defaultSettings);
      const result = await calc.calculatePayroll();

      expect(result!.payslipItems.ffp.total).toBeCloseTo(CPT_FFP_TOTAL, 1);
    });

    it("net payment equals totaleCompetenze minus totaleTrattenute", async () => {
      const calc = new PayslipCalculator(defaultInput, defaultSettings);
      const result = await calc.calculatePayroll();

      expect(result!.netPayment).toBeCloseTo(
        result!.totaleCompetenze - result!.totaleTrattenute,
        2,
      );
    });
  });

  describe("13th month (December bonus)", () => {
    it("basic13th is zero in non-December months", async () => {
      const input = { ...defaultInput, date: "2025-05-01" };
      const calc = new PayslipCalculator(input, defaultSettings);
      const result = await calc.calculatePayroll();

      expect(result!.payslipItems.basic13th.total).toBe(0);
    });

    it("basic13th equals basic in December", async () => {
      const input = { ...defaultInput, date: "2025-12-01" };
      const calc = new PayslipCalculator(input, defaultSettings);
      const result = await calc.calculatePayroll();

      expect(result!.payslipItems.basic13th.total).toBeCloseTo(CPT_BASIC, 1);
    });

    it("December grossPay is higher than non-December by ~basic amount", async () => {
      const calcMay = new PayslipCalculator(
        { ...defaultInput, date: "2025-05-01" },
        defaultSettings,
      );
      const calcDec = new PayslipCalculator(
        { ...defaultInput, date: "2025-12-01" },
        defaultSettings,
      );

      const [mayResult, decResult] = await Promise.all([
        calcMay.calculatePayroll(),
        calcDec.calculatePayroll(),
      ]);

      const diff = decResult!.grossPay - mayResult!.grossPay;
      expect(diff).toBeCloseTo(CPT_BASIC, 0);
    });
  });

  describe("new captain (cu) reduction", () => {
    it("reduces basic by 10% when cu=true", async () => {
      const settingsCU = { ...defaultSettings, cu: true };

      const [regular, cu] = await Promise.all([
        new PayslipCalculator(defaultInput, defaultSettings).calculatePayroll(),
        new PayslipCalculator(defaultInput, settingsCU).calculatePayroll(),
      ]);

      expect(cu!.payslipItems.basic.total).toBeCloseTo(
        regular!.payslipItems.basic.total * 0.9,
        1,
      );
    });

    it("reduces FFP by 10% when cu=true", async () => {
      const settingsCU = { ...defaultSettings, cu: true };

      const [regular, cu] = await Promise.all([
        new PayslipCalculator(defaultInput, defaultSettings).calculatePayroll(),
        new PayslipCalculator(defaultInput, settingsCU).calculatePayroll(),
      ]);

      // FFP is reduced by CU; allowance is not reduced
      // Corrected FFP after CU: CPT_FFP * 0.9 + allowance
      const expectedFFP = CPT_FFP * 0.9 + CPT_ALLOWANCE;
      expect(cu!.payslipItems.ffp.total).toBeCloseTo(expectedFFP, 1);
    });
  });

  describe("part-time reduction", () => {
    it("reduces basic by 50% when parttime=true and percentage=0.5", async () => {
      const settingsPT = {
        ...defaultSettings,
        parttime: true,
        parttimePercentage: 0.5,
      };

      const [regular, parttime] = await Promise.all([
        new PayslipCalculator(defaultInput, defaultSettings).calculatePayroll(),
        new PayslipCalculator(defaultInput, settingsPT).calculatePayroll(),
      ]);

      expect(parttime!.payslipItems.basic.total).toBeCloseTo(
        regular!.payslipItems.basic.total * 0.5,
        1,
      );
    });
  });

  describe("OOB (out of base nights)", () => {
    it("adds OOB pay for each night", async () => {
      const inputWithOOB = { ...defaultInput, oob: 5 };

      const [noOob, withOob] = await Promise.all([
        new PayslipCalculator(defaultInput, defaultSettings).calculatePayroll(),
        new PayslipCalculator(inputWithOOB, defaultSettings).calculatePayroll(),
      ]);

      const oobPay =
        withOob!.payslipItems.oob.total - noOob!.payslipItems.oob.total;
      expect(oobPay).toBeCloseTo(5 * CPT_OOB, 1);
    });
  });

  describe("annual leave (AL)", () => {
    it("adds AL pay for each day", async () => {
      const inputWithAL = { ...defaultInput, al: 3 };
      const calc = new PayslipCalculator(inputWithAL, defaultSettings);
      const result = await calc.calculatePayroll();

      expect(result!.payslipItems.al.total).toBeCloseTo(3 * CPT_AL, 1);
    });
  });

  describe("INPS calculation", () => {
    it("INPS imponibile is at least the minimum (26 days * daily floor)", async () => {
      // Min daily is 56.87, 26 days = 1478.62
      const MIN_INPS = 56.87 * 26;
      const calc = new PayslipCalculator(defaultInput, defaultSettings);
      const result = await calc.calculatePayroll();

      expect(result!.areaINPS.imponibile).toBeGreaterThanOrEqual(
        MIN_INPS - 0.01,
      );
    });

    it("total INPS contributions equal sum of individual contributions", async () => {
      const calc = new PayslipCalculator(defaultInput, defaultSettings);
      const result = await calc.calculatePayroll();

      const { contribuzione, contribuzioneTotale } = result!.areaINPS;
      const sum =
        contribuzione.ivs +
        contribuzione.ivsAdd +
        contribuzione.fis +
        contribuzione.cigs +
        contribuzione.fsta;

      expect(contribuzioneTotale).toBeCloseTo(sum, 2);
    });
  });

  describe("TFR calculation", () => {
    it("TFR is positive for a CPT with basic pay", async () => {
      const calc = new PayslipCalculator(defaultInput, defaultSettings);
      const result = await calc.calculatePayroll();

      expect(result!.areaIRPEF.tfr).toBeGreaterThan(0);
    });

    it("retribuzioneUtileTFR includes basic and FFP", async () => {
      const calc = new PayslipCalculator(defaultInput, defaultSettings);
      const result = await calc.calculatePayroll();

      const rut = result!.areaIRPEF.retribuzioneUtileTFR;
      expect(rut).toBeGreaterThanOrEqual(CPT_BASIC + CPT_FFP_TOTAL - 0.01);
    });
  });

  describe("FO role", () => {
    it("calculates FO payroll correctly", async () => {
      const foSettings = { ...defaultSettings, rank: "fo" };
      const calc = new PayslipCalculator(defaultInput, foSettings);
      const result = await calc.calculatePayroll();

      expect(result).not.toBeNull();
      expect(result!.payslipItems.basic.total).toBeCloseTo(FO_BASIC, 1);
    });
  });

  describe("factory function", () => {
    it("calculatePayroll factory returns same result as class", async () => {
      const [fromFactory, fromClass] = await Promise.all([
        calculatePayroll(defaultInput, defaultSettings),
        new PayslipCalculator(defaultInput, defaultSettings).calculatePayroll(),
      ]);

      expect(fromFactory!.netPayment).toBeCloseTo(fromClass!.netPayment, 2);
      expect(fromFactory!.grossPay).toBeCloseTo(fromClass!.grossPay, 2);
    });
  });
});
