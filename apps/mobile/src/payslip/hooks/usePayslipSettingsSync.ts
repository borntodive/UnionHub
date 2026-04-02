import { useEffect, useRef } from "react";
import { useOfflineStore } from "../../store/offlineStore";
import { usePayslipStore } from "../store/usePayslipStore";
import { useAuthStore } from "../../store/authStore";
import { payslipSettingsApi } from "../../api/payslipSettings";
import { PayslipSettings } from "../types";
import { Ruolo } from "../../types";
import { getUnionFee } from "../data/contractData";
import { clearContractCache } from "../services/contractDataService";

/** Build initial settings seeded from the logged-in user's profile */
function buildSettingsFromUser(base: PayslipSettings): PayslipSettings {
  const user = useAuthStore.getState().user;
  if (!user) return base;

  const role = user.ruolo === Ruolo.CABIN_CREW ? "cc" : "pil";
  const rank = user.grade?.codice?.toLowerCase() ?? base.rank;
  const union = getUnionFee(rank, role);

  return { ...base, role, rank, union };
}

/**
 * Standalone sync function — callable from anywhere (login, hook, reconnect).
 *
 * - Local has pending changes → push first
 * - Server has settings → apply them (server is source of truth)
 * - Server returns null → initialize from user profile, push to server
 */
export async function syncPayslipSettings(): Promise<void> {
  const {
    settings,
    settingsPendingSync,
    applyServerSettings,
    markSettingsSynced,
  } = usePayslipStore.getState();

  try {
    if (settingsPendingSync) {
      await payslipSettingsApi.put(settings);
      markSettingsSynced();
    } else {
      const serverSettings = await payslipSettingsApi.get();
      if (serverSettings) {
        const fetched = serverSettings as PayslipSettings;
        const user = useAuthStore.getState().user;
        const currentRank = user?.grade?.codice?.toLowerCase();

        if (currentRank && currentRank !== fetched.rank) {
          // Grade changed since last sync — update role, rank, union
          const role = user?.ruolo === Ruolo.CABIN_CREW ? "cc" : "pil";
          const union = getUnionFee(currentRank, role);
          const corrected = { ...fetched, role, rank: currentRank, union };
          applyServerSettings(corrected);
          await payslipSettingsApi.put(corrected);
        } else {
          applyServerSettings(fetched);
        }
      } else {
        // First login — initialize from user profile and save to server
        const initialSettings = buildSettingsFromUser(settings);
        applyServerSettings(initialSettings);
        await payslipSettingsApi.put(initialSettings);
      }
    }
  } catch {
    // Silent fail — local settings remain usable offline
  }
}

/**
 * Hook that runs syncPayslipSettings on mount and when coming back online.
 * Mount in InputScreen and SettingsScreen.
 */
export const usePayslipSettingsSync = () => {
  const isOnline = useOfflineStore((state) => state.isOnline);
  const prevOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (isOnline) {
      clearContractCache();
      syncPayslipSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevOnlineRef.current === false && isOnline === true) {
      syncPayslipSettings();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);
};
