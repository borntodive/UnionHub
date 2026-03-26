import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PayslipInput,
  PayslipSettings,
  Payroll,
  SavedCalculation,
  AdditionalInput,
  AdditionalDeductionInput,
} from "../types";
import { calculatePayroll } from "../services/PayslipCalculator";
import { payslipSettingsApi } from "../../api/payslipSettings";
import { useOfflineStore } from "../../store/offlineStore";

interface PayslipState {
  input: PayslipInput;
  settings: PayslipSettings;
  result: Payroll | null;
  history: SavedCalculation[];
  isCalculating: boolean;
  error: string | null;
  overrideActive: boolean;
  overrideSettings: PayslipSettings;
  overrideRsa: boolean;
  overrideItud: boolean;
  /** Local settings have been modified but not yet pushed to the server */
  settingsPendingSync: boolean;

  setInput: (input: Partial<PayslipInput>) => void;
  setSettings: (settings: Partial<PayslipSettings>) => void;
  /** Apply settings fetched from server (does NOT mark as pending) */
  applyServerSettings: (settings: PayslipSettings) => void;
  markSettingsSynced: () => void;
  setOverrideActive: (active: boolean) => void;
  setOverrideSettings: (settings: Partial<PayslipSettings>) => void;
  setOverrideRsa: (v: boolean) => void;
  setOverrideItud: (v: boolean) => void;
  calculate: (userFlags?: { itud?: boolean; rsa?: boolean }) => Promise<void>;
  saveCalculation: (name?: string) => void;
  deleteCalculation: (id: string) => void;
  loadCalculation: (id: string) => void;
  reset: () => void;
  // Additional payments
  addAdditionalPayment: (item: AdditionalInput) => void;
  updateAdditionalPayment: (index: number, item: AdditionalInput) => void;
  removeAdditionalPayment: (index: number) => void;
  // Additional deductions
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
      history: [],
      isCalculating: false,
      error: null,
      overrideActive: false,
      overrideSettings: { ...defaultSettings },
      overrideRsa: false,
      overrideItud: false,
      settingsPendingSync: false,

      setInput: (input) => {
        set((state) => ({ input: { ...state.input, ...input } }));
      },

      setSettings: (settings) => {
        const merged = { ...get().settings, ...settings };
        set({ settings: merged, settingsPendingSync: true });

        // Push immediately if online — fire and forget
        if (useOfflineStore.getState().isOnline) {
          payslipSettingsApi
            .put(merged)
            .then(() => usePayslipStore.getState().markSettingsSynced())
            .catch(() => {
              // stay pending — will retry on next mount/reconnect
            });
        }
      },

      applyServerSettings: (settings) => {
        set({ settings, settingsPendingSync: false });
      },

      markSettingsSynced: () => {
        set({ settingsPendingSync: false });
      },

      setOverrideActive: (active) => set({ overrideActive: active }),

      setOverrideRsa: (v) => set({ overrideRsa: v }),
      setOverrideItud: (v) => set({ overrideItud: v }),

      setOverrideSettings: (settings) => {
        set((state) => ({
          overrideSettings: { ...state.overrideSettings, ...settings },
        }));
      },

      calculate: async (userFlags = {}) => {
        const { input, settings, overrideActive, overrideSettings } = get();
        const activeSettings = overrideActive
          ? { ...overrideSettings, legacyDirect: true }
          : { ...settings, legacyDirect: false };
        set({ isCalculating: true, error: null });

        try {
          const result = await calculatePayroll(
            input,
            activeSettings,
            userFlags,
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

      saveCalculation: (name) => {
        const { input, settings, result, history } = get();
        if (!result) return;

        const calculation: SavedCalculation = {
          id: Date.now().toString(),
          name: name || `Calcolo ${new Date().toLocaleDateString("it-IT")}`,
          date: input.date,
          input: { ...input },
          settings: { ...settings },
          result,
          createdAt: new Date().toISOString(),
        };

        set({ history: [calculation, ...history].slice(0, 50) });
      },

      deleteCalculation: (id) => {
        set((state) => ({
          history: state.history.filter((c) => c.id !== id),
        }));
      },

      loadCalculation: (id) => {
        const { history } = get();
        const calculation = history.find((c) => c.id === id);
        if (calculation) {
          set({
            input: calculation.input,
            settings: calculation.settings,
            result: calculation.result,
          });
        }
      },

      reset: () => {
        set({ input: { ...defaultInput }, result: null, error: null });
      },

      // Additional payments
      addAdditionalPayment: (item) => {
        set((state) => ({
          input: {
            ...state.input,
            additional: [...state.input.additional, item],
          },
        }));
      },

      updateAdditionalPayment: (index, item) => {
        set((state) => ({
          input: {
            ...state.input,
            additional: state.input.additional.map((a, i) =>
              i === index ? item : a,
            ),
          },
        }));
      },

      removeAdditionalPayment: (index) => {
        set((state) => ({
          input: {
            ...state.input,
            additional: state.input.additional.filter((_, i) => i !== index),
          },
        }));
      },

      // Additional deductions
      addAdditionalDeduction: (item) => {
        set((state) => ({
          input: {
            ...state.input,
            additionalDeductions: [...state.input.additionalDeductions, item],
          },
        }));
      },

      updateAdditionalDeduction: (index, item) => {
        set((state) => ({
          input: {
            ...state.input,
            additionalDeductions: state.input.additionalDeductions.map(
              (a, i) => (i === index ? item : a),
            ),
          },
        }));
      },

      removeAdditionalDeduction: (index) => {
        set((state) => ({
          input: {
            ...state.input,
            additionalDeductions: state.input.additionalDeductions.filter(
              (_, i) => i !== index,
            ),
          },
        }));
      },
    }),
    {
      name: "payslip-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        settings: state.settings,
        history: state.history,
        settingsPendingSync: state.settingsPendingSync,
      }),
    },
  ),
);
