import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IssueCategory, IssueUrgency } from "../types";

export interface PendingIssue {
  localId: string;
  title: string;
  description: string;
  categoryId: string;
  urgencyId: string;
  createdAt: string;
}

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  receivedAt: string;
  data?: Record<string, unknown>;
}

const MAX_NOTIFICATIONS = 50;

export interface NotificationPrefs {
  /** Notifica quando lo stato di una mia segnalazione cambia */
  issueStatusUpdate: boolean;
  /** Notifica quando viene creata una nuova segnalazione (solo admin/superadmin) */
  newIssue: boolean;
  /** Notifica quando viene pubblicato un nuovo comunicato sindacale */
  newDocument: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  issueStatusUpdate: true,
  newIssue: true,
  newDocument: true,
};

interface OfflineState {
  isOnline: boolean;
  categories: IssueCategory[];
  urgencies: IssueUrgency[];
  pendingIssues: PendingIssue[];
  notifications: StoredNotification[];
  notificationPrefs: NotificationPrefs;
  setIsOnline: (online: boolean) => void;
  setCategories: (categories: IssueCategory[]) => void;
  setUrgencies: (urgencies: IssueUrgency[]) => void;
  addPendingIssue: (issue: Omit<PendingIssue, "localId" | "createdAt">) => void;
  removePendingIssue: (localId: string) => void;
  addNotification: (notification: StoredNotification) => void;
  clearNotifications: () => void;
  setNotificationPrefs: (prefs: Partial<NotificationPrefs>) => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      isOnline: false, // starts false; NetInfo sets it to true once confirmed online
      categories: [],
      urgencies: [],
      pendingIssues: [],
      notifications: [],
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,

      setIsOnline: (isOnline) => set({ isOnline }),

      setCategories: (categories) => set({ categories }),

      setUrgencies: (urgencies) => set({ urgencies }),

      addPendingIssue: (issue) =>
        set((state) => ({
          pendingIssues: [
            ...state.pendingIssues,
            {
              ...issue,
              localId: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      removePendingIssue: (localId) =>
        set((state) => ({
          pendingIssues: state.pendingIssues.filter(
            (i) => i.localId !== localId,
          ),
        })),

      addNotification: (notification) =>
        set((state) => {
          if (state.notifications.some((n) => n.id === notification.id))
            return state;
          return {
            notifications: [notification, ...state.notifications].slice(
              0,
              MAX_NOTIFICATIONS,
            ),
          };
        }),

      clearNotifications: () => set({ notifications: [] }),

      setNotificationPrefs: (prefs) =>
        set((state) => ({
          notificationPrefs: { ...state.notificationPrefs, ...prefs },
        })),
    }),
    {
      name: "offline-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        categories: state.categories,
        urgencies: state.urgencies,
        pendingIssues: state.pendingIssues,
        notifications: state.notifications,
        notificationPrefs: state.notificationPrefs,
      }),
    },
  ),
);
