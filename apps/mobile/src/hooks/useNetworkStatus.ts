import { useEffect, useRef } from "react";
import { NativeModules } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useOfflineStore } from "../store/offlineStore";
import { issuesApi } from "../api/issues";

// @react-native-community/netinfo requires a native module not available in Expo Go.
// Guard the import so the app doesn't crash in Expo Go.
let NetInfo: typeof import("@react-native-community/netinfo").default | null =
  null;
if (NativeModules.RNCNetInfo) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NetInfo = require("@react-native-community/netinfo").default;
}

/**
 * Syncs all pending offline issues to the server.
 * Reads fresh state from the store (no closure staleness).
 */
async function syncPendingIssues(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  const { pendingIssues, removePendingIssue } = useOfflineStore.getState();
  if (pendingIssues.length === 0) return;

  let synced = false;
  for (const issue of [...pendingIssues]) {
    try {
      await issuesApi.createIssue({
        title: issue.title,
        description: issue.description,
        categoryId: issue.categoryId,
        urgencyId: issue.urgencyId,
      });
      removePendingIssue(issue.localId);
      synced = true;
    } catch {
      // Keep in queue — will retry on next reconnect
    }
  }

  if (synced) {
    queryClient.invalidateQueries({ queryKey: ["myIssues"] });
    queryClient.invalidateQueries({ queryKey: ["adminIssues"] });
  }
}

/**
 * Monitors network connectivity and:
 * - Updates offlineStore.isOnline
 * - Syncs the pending issues queue when coming back online
 */
export const useNetworkStatus = () => {
  const queryClient = useQueryClient();
  const isOnline = useOfflineStore((state) => state.isOnline);
  const prevOnlineRef = useRef<boolean | null>(null);

  // Register the NetInfo listener only once — reads store via getState() to
  // avoid closure staleness and prevent unnecessary re-registrations.
  useEffect(() => {
    if (!NetInfo) {
      // Native module unavailable (Expo Go) — assume online
      useOfflineStore.getState().setIsOnline(true);
      syncPendingIssues(queryClient);
      return;
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(
        state.isConnected && state.isInternetReachable !== false
      );
      useOfflineStore.getState().setIsOnline(online);
    });

    syncPendingIssues(queryClient);

    return unsubscribe;
  }, [queryClient]); // queryClient is stable — this runs exactly once

  // Trigger sync whenever isOnline transitions false → true
  useEffect(() => {
    if (prevOnlineRef.current === false && isOnline === true) {
      syncPendingIssues(queryClient);
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, queryClient]);
};

export default useNetworkStatus;
