import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Menu, Plus, CloudLightning, Info } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography, borderRadius } from "../theme";
import { metarApi } from "../api/metar";
import { MetarSummaryCard } from "../components/MetarSummaryCard";
import { useMetarStore } from "../store/metarStore";
import { useOfflineStore } from "../store/offlineStore";

export const MetarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const isOnline = useOfflineStore((state) => state.isOnline);
  const { savedIcaos } = useMetarStore();
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch weather for all saved airports
  const {
    data: weatherData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["weather-multiple", savedIcaos],
    queryFn: async () => {
      if (savedIcaos.length === 0) return [];
      const promises = savedIcaos.map((icao) => metarApi.getWeather(icao));
      const results = await Promise.allSettled(promises);
      return results.map((result, index) => ({
        icao: savedIcaos[index],
        status: result.status,
        data: result.status === "fulfilled" ? result.value : null,
      }));
    },
    enabled: savedIcaos.length > 0 && isOnline,
    staleTime: 1000 * 60 * 5,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const navigateToDetail = (icao: string) => {
    navigation.navigate("MetarDetail", { icao });
  };

  const navigateToManage = () => {
    navigation.navigate("MetarManage");
  };

  return (
    <View style={styles.container} testID="metar-screen">
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => (navigation as any).openDrawer?.()}
            testID="menu-button"
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("navigation.metar")}</Text>
          <View style={styles.menuButton} />
        </View>
      </SafeAreaView>

      {!isOnline ? (
        <View style={styles.offlineContainer}>
          <Info size={48} color={colors.warning} />
          <Text style={styles.offlineTitle}>{t("metar.offlineTitle")}</Text>
          <Text style={styles.offlineText}>{t("metar.offlineText")}</Text>
        </View>
      ) : savedIcaos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CloudLightning size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>{t("metar.noSavedTitle")}</Text>
          <Text style={styles.emptyText}>{t("metar.noSavedText")}</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={navigateToManage}
          >
            <Plus size={20} color={colors.textInverse} />
            <Text style={styles.emptyButtonText}>{t("metar.addAirports")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            weatherData?.map((item) => {
              if (item.status === "fulfilled" && item.data?.metar) {
                return (
                  <MetarSummaryCard
                    key={item.icao}
                    icao={item.icao}
                    metar={item.data.metar}
                    tafExpiry={item.data.taf?.decoded.validUntil}
                    onPress={() => navigateToDetail(item.icao)}
                  />
                );
              }
              // Error card for failed fetches
              return (
                <TouchableOpacity
                  key={item.icao}
                  style={styles.errorCard}
                  onPress={() => navigateToDetail(item.icao)}
                  activeOpacity={0.7}
                >
                  <View style={styles.errorCardHeader}>
                    <Text style={styles.errorCardIcao}>{item.icao}</Text>
                    <Text style={styles.errorCardText}>
                      {t("metar.fetchError")}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* FAB */}
      {isOnline && savedIcaos.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={navigateToManage}
          activeOpacity={0.8}
        >
          <Plus size={24} color={colors.textInverse} />
        </TouchableOpacity>
      )}
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
  menuButton: {
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  offlineContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  offlineTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  offlineText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  emptyButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textInverse,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorCardIcao: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  errorCardText: {
    fontSize: typography.sizes.sm,
    color: colors.error,
  },
  fab: {
    position: "absolute",
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
