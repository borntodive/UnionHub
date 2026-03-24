import { useEffect, useRef } from "react";
import { useOfflineStore } from "../../store/offlineStore";
import { usePayslipStore } from "../store/usePayslipStore";
import { payslipSettingsApi } from "../../api/payslipSettings";
import { PayslipSettings } from "../types";

/**
 * Syncs payslip settings between local store and backend.
 *
 * Mount this hook in both InputScreen and SettingsScreen.
 *
 * Logic:
 * - On mount (online): if pending local changes → push first; else → fetch from server
 * - On back online (offline→online): push pending local changes if any
 */
export const usePayslipSettingsSync = () => {
  const isOnline = useOfflineStore((state) => state.isOnline);
  const prevOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (isOnline) {
      syncSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // on mount only

  // When coming back online, push any pending changes
  useEffect(() => {
    if (prevOnlineRef.current === false && isOnline === true) {
      syncSettings();
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline]);
};

async function syncSettings() {
  const {
    settings,
    settingsPendingSync,
    applyServerSettings,
    markSettingsSynced,
  } = usePayslipStore.getState();

  try {
    if (settingsPendingSync) {
      // Local changes not yet pushed — push them first
      await payslipSettingsApi.put(settings);
      markSettingsSynced();
    } else {
      // No pending local changes — fetch from server (source of truth)
      const serverSettings = await payslipSettingsApi.get();
      if (serverSettings) {
        applyServerSettings(serverSettings as PayslipSettings);
      }
    }
  } catch {
    // Silent fail — local settings remain usable
  }
}
