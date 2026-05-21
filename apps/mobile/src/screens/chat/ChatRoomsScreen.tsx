import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react-native";
import { chatApi, ChatRoom } from "../../api/chat";
import { QUERY_KEYS } from "../../api/queryKeys";
import { colors, spacing, typography, borderRadius } from "../../theme";

interface Props {
  navigation: any;
}

export function ChatRoomsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    data: rooms,
    isLoading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEYS.chatRooms,
    queryFn: chatApi.getRooms,
  });

  const renderRoom = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={styles.roomItem}
      onPress={() =>
        navigation.navigate("ChatRoom", {
          roomId: item.id,
          roomName: item.name,
        })
      }
    >
      <View style={styles.roomIcon}>
        <Text style={styles.roomHash}>#</Text>
      </View>
      <Text style={styles.roomName}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView style={styles.flex} edges={["bottom", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("unionChat.title")}</Text>
        </View>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>
              {t("unionChat.loadRoomsError")}
            </Text>
          </View>
        ) : (
          <FlatList
            data={rooms ?? []}
            keyExtractor={(item) => item.id}
            renderItem={renderRoom}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyText}>{t("unionChat.noRooms")}</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  statusBarHack: { backgroundColor: colors.primary },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  menuIcon: { color: colors.textInverse, fontSize: 20, width: 28 },
  headerTitle: {
    flex: 1,
    color: colors.textInverse,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
  },
  listContent: { paddingVertical: spacing.sm },
  roomItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  roomIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  roomHash: {
    color: colors.textInverse,
    fontSize: 16,
    fontWeight: typography.weights.bold,
  },
  roomName: {
    flex: 1,
    color: colors.text,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  separator: { height: 1, backgroundColor: colors.border },
  errorText: { color: colors.error, fontSize: typography.sizes.sm },
  emptyText: { color: colors.textSecondary, fontSize: typography.sizes.sm },
});
