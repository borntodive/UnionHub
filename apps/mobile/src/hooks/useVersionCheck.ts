import { useEffect, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import Constants from "expo-constants";
import { releasesApi, AppReleaseLatest } from "../api/releases";
import { compareVersions } from "../utils/compareVersions";

export interface NativeUpdateInfo {
  latestVersion: string;
  minVersion: string | null;
  releaseNotes: string | null;
  isForced: boolean;
}

export function useVersionCheck() {
  const [nativeUpdate, setNativeUpdate] = useState<NativeUpdateInfo | null>(
    null,
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          checkNativeVersion();
        }
      },
    );

    checkNativeVersion();

    return () => subscription.remove();
  }, []);

  async function checkNativeVersion() {
    try {
      const platform = Platform.OS;
      const release: AppReleaseLatest | null =
        await releasesApi.getLatest(platform);
      if (!release) return;

      const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
      const isOutdated = compareVersions(currentVersion, release.version) < 0;
      if (!isOutdated) {
        setNativeUpdate(null);
        return;
      }

      const isForced =
        !!release.minVersion &&
        compareVersions(currentVersion, release.minVersion) < 0;

      setNativeUpdate({
        latestVersion: release.version,
        minVersion: release.minVersion,
        releaseNotes: release.releaseNotes,
        isForced,
      });
    } catch (error) {
      console.error("Version check failed:", error);
    }
  }

  return { nativeUpdate };
}
