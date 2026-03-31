import { useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { useOfflineStore } from "../store/offlineStore";
import apiClient from "../api/client";
import { QUERY_KEYS } from "../api/queryKeys";
import { RAG_QUERY_KEYS } from "../api/rag";

// Configure how notifications appear when the app is in the foreground.
// Silent system notifications (CATEGORIES_UPDATED, URGENCIES_UPDATED) are
// handled quietly — no alert, no sound.
// User prefs (newIssue / issueStatusUpdate) suppress foreground alerts.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type as string | undefined;
    const isSilent =
      type === "CATEGORIES_UPDATED" || type === "URGENCIES_UPDATED";
    if (isSilent) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
    const prefs = useOfflineStore.getState().notificationPrefs;
    if (type === "NEW_ISSUE" && !prefs.newIssue) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
    if (type === "ISSUE_STATUS_UPDATED" && !prefs.issueStatusUpdate) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
    if (type === "new_document" && !prefs.newDocument) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export const useNotifications = () => {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const addNotification = useOfflineStore((state) => state.addNotification);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      console.log("Push notifications only work on physical devices");
      return;
    }

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Push notification permission not granted");
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId:
          Constants.easConfig?.projectId ??
          "505f6694-7b00-484d-94cd-fcebdb0ee8e9",
      });

      const token = tokenData.data;
      await apiClient.post("/notifications/register-token", {
        token,
        platform: Platform.OS,
      });

      console.log("Push token registered successfully");
    } catch (error) {
      console.error("Failed to register for push notifications:", error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications();

    // Listen for incoming notifications (app in foreground)
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        const type = notification.request.content.data?.type as
          | string
          | undefined;

        if (type === "CATEGORIES_UPDATED") {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.issueCategories(),
          });
        } else if (type === "URGENCIES_UPDATED") {
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.issueUrgencies,
          });
        } else if (type === "NEW_GMAIL") {
          queryClient.invalidateQueries({ queryKey: ["gmail-inbox"] });
        } else if (
          type === "RAG_INGESTION_COMPLETED" ||
          type === "RAG_INGESTION_FAILED"
        ) {
          // Refresh RAG documents list and specific document
          queryClient.invalidateQueries({
            queryKey: RAG_QUERY_KEYS.documents,
          });
          const documentId = notification.request.content.data?.documentId;
          if (documentId) {
            queryClient.invalidateQueries({
              queryKey: RAG_QUERY_KEYS.document(documentId),
            });
          }
        }

        if (notification.request.content.title) {
          // Persist visible notifications only if pref allows it
          const prefs = useOfflineStore.getState().notificationPrefs;
          const notifType = type as string | undefined;
          const allowed =
            (notifType === "NEW_ISSUE" && prefs.newIssue) ||
            (notifType === "ISSUE_STATUS_UPDATED" && prefs.issueStatusUpdate) ||
            (notifType === "new_document" && prefs.newDocument) ||
            (notifType !== "NEW_ISSUE" &&
              notifType !== "ISSUE_STATUS_UPDATED" &&
              notifType !== "new_document");
          if (allowed) {
            addNotification({
              id: notification.request.identifier,
              title: notification.request.content.title,
              body: notification.request.content.body ?? "",
              receivedAt: new Date().toISOString(),
              data: notification.request.content.data as Record<
                string,
                unknown
              >,
            });
          }
        }
      });

    // Listen for notification taps (app in background/closed)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        const type = data?.type as string | undefined;

        if (
          type === "RAG_INGESTION_COMPLETED" ||
          type === "RAG_INGESTION_FAILED"
        ) {
          const documentId = data?.documentId as string | undefined;
          if (documentId) {
            // Navigate to document detail screen
            // Note: navigation ref would be needed here for proper navigation from background
            console.log("Navigate to RAG document:", documentId);
          }
        } else if (data?.documentId) {
          console.log("Navigate to document:", data.documentId);
        }
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isAuthenticated, registerForPushNotifications, queryClient]);

  return { registerForPushNotifications };
};

export default useNotifications;
