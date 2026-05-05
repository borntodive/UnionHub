import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface VolmetState {
  nearMeEnabled: boolean;
  radiusNm: number;
  toggleNearMe: () => void;
  setRadius: (radius: number) => void;
  setNearMeEnabled: (enabled: boolean) => void;
}

export const useVolmetStore = create<VolmetState>()(
  persist(
    (set) => ({
      nearMeEnabled: false,
      radiusNm: 300,
      toggleNearMe: () =>
        set((state) => ({ nearMeEnabled: !state.nearMeEnabled })),
      setRadius: (radius) => set({ radiusNm: radius }),
      setNearMeEnabled: (enabled) => set({ nearMeEnabled: enabled }),
    }),
    {
      name: "volmet-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
