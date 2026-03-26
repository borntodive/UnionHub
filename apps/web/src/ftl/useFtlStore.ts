import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { StandbyInput } from "@unionhub/shared/ftl";

interface FtlState {
  reportTime: string;
  sectors: number;
  wakeTime: string;
  standby: StandbyInput;
  dutyStart: string;
  finishTime: string;
  isHomeBase: boolean;
  currentFdp: string;
  extType: "planned" | "discretionary";
  set: (patch: Partial<Omit<FtlState, "set" | "reset">>) => void;
  reset: () => void;
}

const DEFAULT_STANDBY: StandbyInput = {
  type: "none",
  startTime: "",
  callTime: "",
  splitDuty: false,
};

const DEFAULTS = {
  reportTime: "",
  sectors: 2,
  wakeTime: "04:30",
  standby: { ...DEFAULT_STANDBY },
  dutyStart: "",
  finishTime: "",
  isHomeBase: true,
  currentFdp: "12:00",
  extType: "planned" as const,
};

export const useFtlStore = create<FtlState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      standby: { ...DEFAULT_STANDBY },
      set: (patch) => set((state) => ({ ...state, ...patch })),
      reset: () => set({ ...DEFAULTS, standby: { ...DEFAULT_STANDBY } }),
    }),
    {
      name: "ftl-web-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
