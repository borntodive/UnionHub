import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Menu,
  Search,
  AlertTriangle,
  Plus,
  Star,
  ChevronRight,
  Plane,
  X,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, spacing, typography, borderRadius } from "../theme";
import { volmetApi, Volmet } from "../api/volmet";
import { metarApi, WeatherResponse } from "../api/metar";
import { useOfflineStore } from "../store/offlineStore";
import { useMetarStore } from "../store/metarStore";
import { getFlightCategoryColor, getFlightCategoryLabel } from "../utils/metar";

export const AirportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isOnline = useOfflineStore((state) => state.isOnline);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [sheetSearch, setSheetSearch] = useState("");

  const { savedIcaos, toggleIcao } = useMetarStore();

  const { data: volmets, isLoading: volmetsLoading } = useQuery({
    queryKey: ["volmets"],
    queryFn: () => volmetApi.getAll(true),
    staleTime: 1000 * 60 * 60,
  });

  const { data: weatherMap, isLoading: weatherLoading } = useQuery({
    queryKey: ["weather-multiple", savedIcaos],
    queryFn: async () => {
      if (savedIcaos.length === 0) return {} as Record<string, WeatherResponse>;
      const promises = savedIcaos.map((icao) => metarApi.getWeather(icao));
      const results = await Promise.allSettled(promises);
      const map: Record<string, WeatherResponse> = {};
      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value?.metar) {
          map[savedIcaos[index]] = result.value;
        }
      });
      return map;
    },
    enabled: savedIcaos.length > 0 && isOnline,
    staleTime: 1000 * 60 * 5,
  });

  // Saved airports: volmets filtered to savedIcaos, preserving save order
  const savedAirports = useMemo(() => {
    if (!volmets) return [];
    const map = new Map(volmets.map((v) => [v.icao, v]));
    return savedIcaos.map((icao) => map.get(icao)).filter(Boolean) as Volmet[];
  }, [volmets, savedIcaos]);

  // Sheet list: all airports filtered by search, not yet saved shown first
  const sheetAirports = useMemo(() => {
    if (!volmets) return [];
    const q = sheetSearch.trim().toLowerCase();
    const filtered = q
      ? volmets.filter(
          (v) =>
            v.icao.toLowerCase().includes(q) ||
            (v.iata && v.iata.toLowerCase().includes(q)) ||
            v.name.toLowerCase().includes(q) ||
            v.city.toLowerCase().includes(q),
        )
      : volmets;
    return [...filtered].sort((a, b) => {
      const aSaved = savedIcaos.includes(a.icao);
      const bSaved = savedIcaos.includes(b.icao);
      if (aSaved !== bSaved) return aSaved ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [volmets, sheetSearch, savedIcaos]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ["volmets"] });
    await queryClient.refetchQueries({ queryKey: ["weather-multiple"] });
    setRefreshing(false);
  };

  const handleStarPress = (icao: string) => {
    toggleIcao(icao);
  };

  const handleCardPress = (item: Volmet) => {
    navigation.navigate("AirportDetail", {
      icao: item.icao,
      volmetId: item.id,
      airportName: item.name,
    });
  };

  const renderSavedCard = (item: Volmet) => {
    const weather = weatherMap?.[item.icao];
    const categoryColor = weather?.metar
      ? getFlightCategoryColor(weather.metar.decoded.flightCategory)
      : null;
    const categoryLabel = weather?.metar
      ? getFlightCategoryLabel(weather.metar.decoded.flightCategory)
      : null;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.itemCard}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <View style={styles.icaoBox}>
            <Text style={styles.icaoText}>{item.icao}</Text>
            {item.iata && <Text style={styles.iataText}>({item.iata})</Text>}
          </View>

          {categoryColor && categoryLabel && (
            <View
              style={[styles.categoryBadge, { backgroundColor: categoryColor }]}
            >
              <Text style={styles.categoryText}>{categoryLabel}</Text>
            </View>
          )}

          <View style={styles.itemHeaderInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemLocation}>
              {item.city}, {item.country}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.starButton}
            onPress={() => handleStarPress(item.icao)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Star size={20} color={colors.warning} fill={colors.warning} />
          </TouchableOpacity>
        </View>

        {item.atis && (
          <View style={styles.atisRow}>
            <Text style={styles.atisLabel}>ATIS:</Text>
            <Text style={styles.atisValue}>{item.atis}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <ChevronRight size={16} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderSheetRow = ({ item }: { item: Volmet }) => {
    const isSaved = savedIcaos.includes(item.icao);
    return (
      <TouchableOpacity
        style={styles.sheetRow}
        onPress={() => toggleIcao(item.icao)}
        activeOpacity={0.6}
      >
        <View style={styles.sheetRowLeft}>
          <View
            style={[
              styles.sheetIcaoBadge,
              isSaved && styles.sheetIcaoBadgeSaved,
            ]}
          >
            <Text
              style={[
                styles.sheetIcaoText,
                isSaved && styles.sheetIcaoTextSaved,
              ]}
            >
              {item.icao}
            </Text>
          </View>
          <View>
            <Text style={styles.sheetName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.sheetLocation}>
              {item.iata ? `${item.iata} · ` : ""}
              {item.city}
            </Text>
          </View>
        </View>
        <Star
          size={20}
          color={isSaved ? colors.warning : colors.border}
          fill={isSaved ? colors.warning : "transparent"}
        />
      </TouchableOpacity>
    );
  };

  const isLoading = volmetsLoading || (savedIcaos.length > 0 && weatherLoading);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => (navigation as any).openDrawer?.()}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("navigation.airports")}</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowAddSheet(true)}
          >
            <Plus size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !isOnline && savedAirports.length === 0 ? (
        <View style={styles.center}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.emptyTitle}>{t("volmet.offlineTitle")}</Text>
          <Text style={styles.emptyText}>{t("volmet.offlineText")}</Text>
        </View>
      ) : savedAirports.length === 0 ? (
        <View style={styles.center}>
          <Plane size={56} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t("airports.noSaved")}</Text>
          <Text style={styles.emptyText}>{t("airports.noSavedHint")}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddSheet(true)}
          >
            <Plus size={18} color={colors.textInverse} />
            <Text style={styles.addButtonText}>
              {t("airports.addAirports")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            isOnline ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        >
          {savedAirports.map(renderSavedCard)}
        </ScrollView>
      )}

      {/* Add Airport Sheet */}
      <Modal
        visible={showAddSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            onPress={() => setShowAddSheet(false)}
            activeOpacity={1}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.sheetContainer}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t("airports.addAirports")}</Text>
              <TouchableOpacity
                onPress={() => setShowAddSheet(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetSearchWrapper}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                style={styles.sheetSearchInput}
                value={sheetSearch}
                onChangeText={setSheetSearch}
                placeholder={t("airports.searchPlaceholder")}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="characters"
                returnKeyType="search"
                autoFocus
              />
              {sheetSearch.length > 0 && (
                <TouchableOpacity onPress={() => setSheetSearch("")}>
                  <X size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>

            {volmetsLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={sheetAirports}
                keyExtractor={(item) => item.id}
                renderItem={renderSheetRow}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.sheetList}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  addButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  icaoBox: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  icaoText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  iataText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.textInverse,
    opacity: 0.8,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  itemHeaderInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  itemLocation: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  starButton: {
    padding: spacing.xs,
  },
  atisRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  atisLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
  },
  atisValue: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.warning,
  },
  cardFooter: {
    alignItems: "flex-end",
    marginTop: spacing.xs,
  },
  // Add Sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    height: "85%",
    paddingBottom: Platform.OS === "ios" ? spacing.xl : spacing.md,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sheetTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  sheetSearchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 44,
    gap: spacing.sm,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  sheetList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  sheetRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  sheetIcaoBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 54,
    alignItems: "center",
  },
  sheetIcaoBadgeSaved: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sheetIcaoText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  sheetIcaoTextSaved: {
    color: colors.textInverse,
  },
  sheetName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  sheetLocation: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
