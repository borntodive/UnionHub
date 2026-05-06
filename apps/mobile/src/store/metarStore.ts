import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RunwayInfo } from "../api/metar";

interface MetarState {
  savedIcaos: string[];
  runways: Record<string, RunwayInfo[]>;
  addIcao: (icao: string) => void;
  removeIcao: (icao: string) => void;
  toggleIcao: (icao: string) => void;
  clearAll: () => void;
  setSavedIcaos: (icaos: string[]) => void;
  setRunways: (icao: string, runways: RunwayInfo[]) => void;
  getRunways: (icao: string) => RunwayInfo[];
  clearRunways: () => void;
}

export const useMetarStore = create<MetarState>()(
  persist(
    (set, get) => ({
      savedIcaos: [],
      runways: {},
      addIcao: (icao) =>
        set((state) => {
          const upper = icao.toUpperCase();
          if (state.savedIcaos.includes(upper)) return state;
          // Limit to 10 airports
          if (state.savedIcaos.length >= 10) return state;
          return { savedIcaos: [...state.savedIcaos, upper] };
        }),
      removeIcao: (icao) =>
        set((state) => ({
          savedIcaos: state.savedIcaos.filter((i) => i !== icao.toUpperCase()),
        })),
      toggleIcao: (icao) =>
        set((state) => {
          const upper = icao.toUpperCase();
          if (state.savedIcaos.includes(upper)) {
            return { savedIcaos: state.savedIcaos.filter((i) => i !== upper) };
          }
          if (state.savedIcaos.length >= 10) return state;
          return { savedIcaos: [...state.savedIcaos, upper] };
        }),
      clearAll: () => set({ savedIcaos: [] }),
      setSavedIcaos: (icaos) => set({ savedIcaos: icaos }),
      setRunways: (icao, runways) =>
        set((state) => ({
          runways: { ...state.runways, [icao.toUpperCase()]: runways },
        })),
      getRunways: (icao) => {
        const state = get();
        return state.runways[icao.toUpperCase()] || [];
      },
      clearRunways: () => set({ runways: {} }),
    }),
    {
      name: "metar-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
