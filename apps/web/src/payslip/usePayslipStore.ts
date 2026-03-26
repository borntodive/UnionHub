import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PayslipInput,
  PayslipSettings,
  Payroll,
  AdditionalInput,
  AdditionalDeductionInput,
  UserContext,
} from "@unionhub/shared/payslip";
import { calculatePayroll } from "@unionhub/shared/payslip";

interface PayslipState {
  input: PayslipInput;
  settings: PayslipSettings;
  result: Payroll | null;
  isCalculating: boolean;
  error: string | null;

  setInput: (input: Partial<PayslipInput>) => void;
  setSettings: (settings: Partial<PayslipSettings>) => void;
  calculate: (userContext?: UserContext) => Promise<void>;
  reset: () => void;
  addAdditionalPayment: (item: AdditionalInput) => void;
  updateAdditionalPayment: (index: number, item: AdditionalInput) => void;
  removeAdditionalPayment: (index: number) => void;
  addAdditionalDeduction: (item: AdditionalDeductionInput) => void;
  updateAdditionalDeduction: (
    index: number,
    item: AdditionalDeductionInput,
  ) => void;
  removeAdditionalDeduction: (index: number) => void;
}

const defaultInput: PayslipInput = {
  date: new Date().toISOString().split("T")[0],
  sbh: "00:00",
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

const defaultSettings: PayslipSettings = {
  company: "RYR",
  role: "pil",
  rank: "fo",
  base: "BGY",
  union: 20,
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

export const usePayslipStore = create<PayslipState>()(
  persist(
    (set, get) => ({
      input: { ...defaultInput },
      settings: { ...defaultSettings },
      result: null,
      isCalculating: false,
      error: null,

      setInput: (input) =>
        set((state) => ({ input: { ...state.input, ...input } })),

      setSettings: (settings) =>
        set((state) => ({ settings: { ...state.settings, ...settings } })),

      calculate: async (userContext = {}) => {
        const { input, settings } = get();
        set({ isCalculating: true, error: null });
        try {
          const result = await calculatePayroll(
            input,
            { ...settings, legacyDirect: false },
            userContext,
          );
          if (result) {
            set({ result, isCalculating: false });
          } else {
            set({ error: "Errore nel calcolo", isCalculating: false });
          }
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Errore sconosciuto",
            isCalculating: false,
          });
        }
      },

      reset: () =>
        set({ input: { ...defaultInput }, result: null, error: null }),

      addAdditionalPayment: (item) =>
        set((state) => ({
          input: {
            ...state.input,
            additional: [...state.input.additional, item],
          },
        })),
      updateAdditionalPayment: (index, item) =>
        set((state) => ({
          input: {
            ...state.input,
            additional: state.input.additional.map((a, i) =>
              i === index ? item : a,
            ),
          },
        })),
      removeAdditionalPayment: (index) =>
        set((state) => ({
          input: {
            ...state.input,
            additional: state.input.additional.filter((_, i) => i !== index),
          },
        })),
      addAdditionalDeduction: (item) =>
        set((state) => ({
          input: {
            ...state.input,
            additionalDeductions: [...state.input.additionalDeductions, item],
          },
        })),
      updateAdditionalDeduction: (index, item) =>
        set((state) => ({
          input: {
            ...state.input,
            additionalDeductions: state.input.additionalDeductions.map(
              (a, i) => (i === index ? item : a),
            ),
          },
        })),
      removeAdditionalDeduction: (index) =>
        set((state) => ({
          input: {
            ...state.input,
            additionalDeductions: state.input.additionalDeductions.filter(
              (_, i) => i !== index,
            ),
          },
        })),
    }),
    {
      name: "payslip-web-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);
