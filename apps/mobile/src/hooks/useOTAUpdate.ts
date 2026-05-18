import { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import * as Updates from "expo-updates";

export interface OTAUpdateInfo {
  version: string;
  createdAt: string | null;
}

export function useOTAUpdate() {
  const [otaUpdate, setOtaUpdate] = useState<OTAUpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          checkForUpdate();
        }
      },
    );

    checkForUpdate();

    return () => subscription.remove();
  }, []);

  async function checkForUpdate() {
    if (isChecking) return;

    try {
      setIsChecking(true);

      if (!Updates.isEnabled) return;

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        const manifest = (update as any).manifest;
        const version =
          manifest?.extra?.expoClient?.version ?? "nuova versione";
        const createdAt = manifest?.createdAt ?? null;
        setOtaUpdate({ version, createdAt });
      } else {
        setOtaUpdate(null);
      }
    } catch (error) {
      console.error("OTA check failed:", error);
    } finally {
      setIsChecking(false);
    }
  }

  async function applyUpdate() {
    try {
      setIsDownloading(true);
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.error("OTA apply failed:", error);
      setIsDownloading(false);
    }
  }

  return {
    otaUpdate,
    isChecking,
    isDownloading,
    applyUpdate,
    checkForUpdate,
  };
}
