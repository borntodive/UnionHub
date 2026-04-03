import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, Mail, RefreshCw } from "lucide-react-native";
import { useTranslation } from "react-i18next";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { gmailApi, EmailSummary } from "../api/gmail";
import { RootStackParamList } from "../../navigation/types";
import { useAuthStore } from "../../store/authStore";
import { UserRole } from "../../types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DrawerNav = DrawerNavigationProp<any>;

const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
};

const stripName = (from: string): string => {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return from.replace(/<.*>/, "").trim() || from;
};

interface EmailRowProps {
  email: EmailSummary;
  onPress: () => void;
}

const EmailRow: React.FC<EmailRowProps> = ({ email, onPress }) => (
  <TouchableOpacity
    style={styles.emailRow}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.emailRowLeft}>
      {email.unread && <View style={styles.unreadDot} />}
      <View
        style={[styles.emailRowContent, email.unread && styles.emailRowUnread]}
      >
        <View style={styles.emailRowHeader}>
          <Text
            style={[styles.emailFrom, email.unread && styles.emailFromUnread]}
            numberOfLines={1}
          >
            {stripName(email.from)}
          </Text>
          <Text style={styles.emailDate}>{formatDate(email.date)}</Text>
        </View>
        <Text
          style={[
            styles.emailSubject,
            email.unread && styles.emailSubjectUnread,
          ]}
          numberOfLines={1}
        >
          {email.subject || "(no subject)"}
        </Text>
        <Text style={styles.emailSnippet} numberOfLines={1}>
          {email.snippet}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

export const GmailScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const drawerNav = useNavigation<DrawerNav>();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [allEmails, setAllEmails] = useState<EmailSummary[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  // Admin/SuperAdmin have no ruolo — default to pilot for testing
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;
  const ruoloParam = isAdmin ? (user?.ruolo ?? "pilot") : undefined;

  const [refreshing, setRefreshing] = useState(false);

  const { isLoading, refetch } = useQuery({
    queryKey: ["gmail-inbox", pageToken, ruoloParam],
    queryFn: async () => {
      const res = await gmailApi.listEmails(pageToken, ruoloParam);
      if (pageToken) {
        setAllEmails((prev) => [...prev, ...res.data.emails]);
      } else {
        setAllEmails(res.data.emails);
      }
      setNextPageToken(res.data.nextPageToken);
      return res.data;
    },
    staleTime: 60_000,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setPageToken(undefined);
      await queryClient.invalidateQueries({ queryKey: ["gmail-inbox"] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const handleLoadMore = useCallback(() => {
    if (nextPageToken && !isLoading) {
      setPageToken(nextPageToken);
    }
  }, [nextPageToken, isLoading]);

  const handleEmailPress = (email: EmailSummary) => {
    navigation.navigate("EmailDetail", {
      messageId: email.id,
      subject: email.subject,
      ruolo: ruoloParam,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => drawerNav.openDrawer()}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("navigation.gmail")}</Text>
          <TouchableOpacity style={styles.headerButton} onPress={handleRefresh}>
            <RefreshCw size={22} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        {isLoading && allEmails.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : allEmails.length === 0 ? (
          <View style={styles.centered}>
            <Mail size={48} color={colors.textTertiary} />
            <Text style={styles.emptyText}>{t("gmail.noEmails")}</Text>
          </View>
        ) : (
          <FlatList
            data={allEmails}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <EmailRow email={item} onPress={() => handleEmailPress(item)} />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isLoading && allEmails.length > 0 ? (
                <ActivityIndicator
                  style={styles.footerLoader}
                  color={colors.primary}
                />
              ) : null
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    color: colors.textInverse,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: "center",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textTertiary,
    fontSize: typography.sizes.base,
  },
  emailRow: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emailRowLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  emailRowContent: {
    flex: 1,
  },
  emailRowUnread: {},
  emailRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  emailFrom: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  emailFromUnread: {
    color: colors.text,
    fontWeight: typography.weights.bold,
  },
  emailDate: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  emailSubject: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  emailSubjectUnread: {
    color: colors.text,
    fontWeight: typography.weights.semibold,
  },
  emailSnippet: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
  },
});
