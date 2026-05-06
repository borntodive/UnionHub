import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Plus,
  Radio,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
} from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { volmetApi, Volmet } from "../../api/volmet";
import { metarApi } from "../../api/metar";
import { RootStackParamList } from "../../navigation/types";

type AirportAdminScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

export const AirportAdminScreen: React.FC = () => {
  const navigation = useNavigation<AirportAdminScreenNavigationProp>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [singleSyncing, setSingleSyncing] = useState<Record<string, boolean>>(
    {},
  );

  const {
    data: volmets,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["volmets-admin"],
    queryFn: () => volmetApi.getAll(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => volmetApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["volmets-admin"] });
      queryClient.invalidateQueries({ queryKey: ["volmets"] });
      queryClient.invalidateQueries({ queryKey: ["volmet-regions"] });
      Alert.alert("Success", "Airport deleted successfully");
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to delete airport",
      );
    },
  });

  const filteredData =
    volmets?.filter((v) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        v.icao.toLowerCase().includes(query) ||
        (v.iata && v.iata.toLowerCase().includes(query)) ||
        v.name.toLowerCase().includes(query) ||
        v.city.toLowerCase().includes(query) ||
        v.region.toLowerCase().includes(query)
      );
    }) || [];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAdd = () => {
    navigation.navigate("VolmetForm", {});
  };

  const handleEdit = (volmet: Volmet) => {
    navigation.navigate("VolmetForm", { volmetId: volmet.id });
  };

  const handleDelete = (volmet: Volmet) => {
    Alert.alert(
      t("airports.confirmDelete"),
      `${volmet.icao} - ${volmet.name}`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => deleteMutation.mutate(volmet.id),
        },
      ],
    );
  };

  const handleBulkSync = async () => {
    const icaos = volmets?.map((v) => v.icao) || [];
    if (icaos.length === 0) {
      Alert.alert(t("airports.noEntries"));
      return;
    }

    setSyncing(true);
    try {
      const result = await metarApi.bulkSyncRunways(icaos);
      Alert.alert(
        t("airports.syncComplete"),
        t("airports.syncResult", {
          added: result?.added || 0,
          errors: result?.errors.length || 0,
        }),
      );
    } catch {
      Alert.alert(t("common.error"), t("airports.syncError"));
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAirport = async (icao: string) => {
    setSingleSyncing((prev) => ({ ...prev, [icao]: true }));
    try {
      await metarApi.syncRunways(icao);
      Alert.alert(t("airports.syncComplete"), t("airports.runwaySynced"));
    } catch {
      Alert.alert(t("common.error"), t("airports.syncError"));
    } finally {
      setSingleSyncing((prev) => ({ ...prev, [icao]: false }));
    }
  };

  const renderItem = ({ item }: { item: Volmet }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemContent}>
        <View style={styles.itemIcon}>
          <Radio
            size={24}
            color={item.isActive ? colors.primary : colors.textTertiary}
          />
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.itemHeaderRow}>
            <Text style={styles.itemIcao}>
              {item.icao}
              {item.iata && <Text style={styles.itemIata}> ({item.iata})</Text>}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: item.isActive
                    ? colors.success + "20"
                    : colors.textTertiary + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: item.isActive ? colors.success : colors.textTertiary,
                  },
                ]}
              >
                {item.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemLocation}>
            {item.city}, {item.country} • {item.region}
          </Text>
          <View style={styles.frequenciesRow}>
            {item.frequencies.map((freq, idx) => (
              <View key={idx} style={styles.frequencyChip}>
                <Text style={styles.frequencyText}>{freq}</Text>
              </View>
            ))}
          </View>
          {item.volmetName && (
            <Text style={styles.volmetNameText}>{item.volmetName}</Text>
          )}
          {item.atis && <Text style={styles.atisText}>ATIS: {item.atis}</Text>}
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleSyncAirport(item.icao)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={singleSyncing[item.icao]}
          >
            {singleSyncing[item.icao] ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <RefreshCw size={18} color={colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Edit3 size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("airports.title")}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleBulkSync}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <RefreshCw size={20} color={colors.textInverse} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Plus size={24} color={colors.textInverse} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search
            size={20}
            color={colors.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("airports.searchPlaceholder")}
            placeholderTextColor={colors.textTertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Radio size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>{t("airports.noEntries")}</Text>
              <Text style={styles.emptySubtext}>
                {t("airports.noEntriesSubtext")}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  clearButtonText: {
    fontSize: typography.sizes.lg,
    color: colors.textTertiary,
    paddingHorizontal: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  itemIcao: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  itemIata: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  itemName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  itemLocation: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  frequenciesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  frequencyChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  frequencyText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  volmetNameText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  atisText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.sizes.base,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});
