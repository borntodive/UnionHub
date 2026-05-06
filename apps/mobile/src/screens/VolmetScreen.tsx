import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Menu,
  Radio,
  Search,
  AlertTriangle,
  Info,
  Navigation,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { colors, spacing, typography, borderRadius } from "../theme";
import { volmetApi, Volmet } from "../api/volmet";

interface VolmetWithDistance extends Volmet {
  distance?: number;
}
import { useOfflineStore } from "../store/offlineStore";
import { useVolmetStore } from "../store/volmetStore";
import { useLocation } from "../hooks/useLocation";
import { calculateDistance } from "../utils/location";

export const VolmetScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isOnline = useOfflineStore((state) => state.isOnline);
  const [refreshing, setRefreshing] = useState(false);

  // Near Me state from store
  const { nearMeEnabled, radiusNm, toggleNearMe, setRadius } = useVolmetStore();

  // Location hook
  const {
    location,
    permission,
    isLoading: locationLoading,
    requestPermission,
    getCurrentLocation,
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [filteredData, setFilteredData] = useState<VolmetWithDistance[]>([]);
  const [radiusText, setRadiusText] = useState(radiusNm.toString());

  const { data: volmets, isLoading } = useQuery({
    queryKey: ["volmets"],
    queryFn: () => volmetApi.getAll(true),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const { data: regions } = useQuery({
    queryKey: ["volmet-regions"],
    queryFn: () => volmetApi.getRegions(),
    staleTime: 1000 * 60 * 60,
  });

  // Sync radius text when radiusNm changes from persisted storage
  useEffect(() => {
    setRadiusText(radiusNm.toString());
  }, [radiusNm]);

  // Request location when Near Me is enabled
  useEffect(() => {
    if (nearMeEnabled && permission === "undetermined") {
      requestPermission();
    } else if (nearMeEnabled && permission === "granted" && !location) {
      getCurrentLocation();
    }
  }, [nearMeEnabled, permission, location]);

  // Refresh location every 5 minutes when Near Me is active
  useEffect(() => {
    if (!nearMeEnabled || permission !== "granted") return;

    // Initial fetch
    getCurrentLocation();

    const interval = setInterval(
      () => {
        getCurrentLocation();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [nearMeEnabled, permission]);

  useEffect(() => {
    if (!volmets) return;

    let filtered: VolmetWithDistance[] = volmets.map((v) => ({ ...v }));

    // Filter by region if selected
    if (selectedRegion) {
      filtered = filtered.filter((v) => v.region === selectedRegion);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.icao.toLowerCase().includes(query) ||
          (v.iata && v.iata.toLowerCase().includes(query)) ||
          v.name.toLowerCase().includes(query) ||
          v.city.toLowerCase().includes(query) ||
          v.country.toLowerCase().includes(query),
      );
    }

    // Filter and sort by distance when Near Me is enabled
    if (nearMeEnabled && location) {
      filtered = filtered
        .map((v) => {
          if (!v.latitude || !v.longitude) return { ...v, distance: undefined };
          return {
            ...v,
            distance: calculateDistance(
              location.latitude,
              location.longitude,
              v.latitude,
              v.longitude,
            ),
          };
        })
        .filter((v) => {
          // Include airports without coordinates (shouldn't happen after seed)
          if (v.distance === undefined) return true;
          return v.distance <= radiusNm;
        })
        .sort((a, b) => {
          // Sort by distance, items without distance go last
          if (a.distance === undefined && b.distance === undefined) return 0;
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
    }

    setFilteredData(filtered);
  }, [volmets, searchQuery, selectedRegion, nearMeEnabled, location, radiusNm]);

  const groupedData = React.useMemo(() => {
    const groups: Record<string, Volmet[]> = {};
    for (const item of filteredData) {
      if (!groups[item.region]) {
        groups[item.region] = [];
      }
      groups[item.region].push(item);
    }
    return groups;
  }, [filteredData]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedRegion(null);
    // Note: we don't disable Near Me here as it's a persistent preference
  };

  const hasActiveFilter = searchQuery.trim() || selectedRegion || nearMeEnabled;

  const handleNearMeToggle = async () => {
    if (!nearMeEnabled) {
      // Enabling Near Me
      if (permission !== "granted") {
        await requestPermission();
      } else {
        await getCurrentLocation();
      }
    }
    toggleNearMe();
  };

  const handleRadiusChange = (text: string) => {
    setRadiusText(text);
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 10 && num <= 2000) {
      setRadius(num);
    }
  };

  const handleNearMeAlert = () => {
    if (permission === "denied" || permission === "never_ask_again") {
      Alert.alert(
        t("volmet.locationDenied"),
        t("volmet.locationDeniedMessage"),
        [{ text: t("common.ok") }],
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ queryKey: ["volmets"] });
    await queryClient.refetchQueries({ queryKey: ["volmet-regions"] });
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => (navigation as any).openDrawer?.()}
          >
            <Menu size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("navigation.volmet")}</Text>
          <View style={styles.menuButton} />
        </View>
      </SafeAreaView>

      {/* Near Me Section */}
      <View style={styles.nearMeSection}>
        <TouchableOpacity
          style={[
            styles.nearMeToggle,
            nearMeEnabled && styles.nearMeToggleActive,
          ]}
          onPress={handleNearMeToggle}
        >
          <Navigation
            size={18}
            color={nearMeEnabled ? colors.textInverse : colors.primary}
          />
          <Text
            style={[
              styles.nearMeToggleText,
              nearMeEnabled && styles.nearMeToggleTextActive,
            ]}
          >
            {t("volmet.nearMe")}
          </Text>
        </TouchableOpacity>

        {nearMeEnabled && (
          <View style={styles.radiusContainer}>
            <TextInput
              style={styles.radiusInput}
              value={radiusText}
              onChangeText={handleRadiusChange}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={styles.radiusSuffix}>NM</Text>
          </View>
        )}

        {nearMeEnabled && !location && !locationLoading && (
          <TouchableOpacity onPress={handleNearMeAlert}>
            <Text style={styles.enableLocationText}>
              {t("volmet.enableLocation")}
            </Text>
          </TouchableOpacity>
        )}

        {nearMeEnabled && locationLoading && (
          <ActivityIndicator size="small" color={colors.primary} />
        )}
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search
            size={20}
            color={colors.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("volmet.searchPlaceholder")}
            placeholderTextColor={colors.textTertiary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Region filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.regionScroll}
          contentContainerStyle={styles.regionScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.regionChip,
              !selectedRegion && styles.regionChipActive,
            ]}
            onPress={() => setSelectedRegion(null)}
          >
            <Text
              style={[
                styles.regionChipText,
                !selectedRegion && styles.regionChipTextActive,
              ]}
            >
              {t("volmet.allRegions")}
            </Text>
          </TouchableOpacity>
          {regions?.map((region) => (
            <TouchableOpacity
              key={region}
              style={[
                styles.regionChip,
                selectedRegion === region && styles.regionChipActive,
              ]}
              onPress={() => setSelectedRegion(region)}
            >
              <Text
                style={[
                  styles.regionChipText,
                  selectedRegion === region && styles.regionChipTextActive,
                ]}
              >
                {region}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {hasActiveFilter && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={clearFilters}
          >
            <Text style={styles.clearFilterText}>
              {t("volmet.clearFilters")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !isOnline ? (
        <View style={styles.offlineContainer}>
          <AlertTriangle size={48} color={colors.warning} />
          <Text style={styles.offlineTitle}>{t("volmet.offlineTitle")}</Text>
          <Text style={styles.offlineText}>{t("volmet.offlineText")}</Text>
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Radio size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{t("volmet.noResults")}</Text>
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
          {/* Info box */}
          <View style={styles.infoBox}>
            <Info size={16} color={colors.primary} />
            <Text style={styles.infoText}>{t("volmet.infoBox")}</Text>
          </View>

          {/* Grouped list */}
          {Object.entries(groupedData).map(([region, items]) => (
            <View key={region} style={styles.regionSection}>
              <Text style={styles.regionHeader}>{region}</Text>
              {items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.icaoBox}>
                      <Text style={styles.icaoText}>{item.icao}</Text>
                      {item.iata && (
                        <Text style={styles.iataText}>({item.iata})</Text>
                      )}
                    </View>
                    <View style={styles.itemHeaderInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemLocation}>
                        {item.city}, {item.country}
                      </Text>
                    </View>
                    {nearMeEnabled && item.distance !== undefined && (
                      <View style={styles.distanceBox}>
                        <Text style={styles.distanceText}>
                          {Math.round(item.distance)} NM
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.frequenciesContainer}>
                    <Text style={styles.frequenciesLabel}>
                      {t("volmet.frequencies")}:
                    </Text>
                    <View style={styles.frequenciesList}>
                      {item.frequencies.map((freq, idx) => (
                        <View key={idx} style={styles.frequencyChip}>
                          <Text style={styles.frequencyText}>{freq}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {item.volmetName && (
                    <View style={styles.volmetNameBox}>
                      <Text style={styles.volmetNameLabel}>VOLMET:</Text>
                      <Text style={styles.volmetNameText}>
                        {item.volmetName}
                      </Text>
                    </View>
                  )}

                  {item.atis && (
                    <View style={styles.atisBox}>
                      <Text style={styles.atisLabel}>ATIS:</Text>
                      <Text style={styles.atisText}>{item.atis}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))}

          {/* Source note */}
          <View style={styles.sourceBox}>
            <Text style={styles.sourceText}>{t("volmet.source")}</Text>
          </View>
        </ScrollView>
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
  searchContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
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
  regionScroll: {
    marginTop: spacing.sm,
    maxHeight: 40,
  },
  regionScrollContent: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  regionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  regionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  regionChipText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  regionChipTextActive: {
    color: colors.textInverse,
  },
  clearFilterButton: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  clearFilterText: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
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
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: "#0369a1",
  },
  regionSection: {
    marginBottom: spacing.lg,
  },
  regionHeader: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    marginBottom: spacing.sm,
  },
  icaoBox: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  icaoText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  iataText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.normal,
    color: colors.textInverse,
    opacity: 0.8,
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
  distanceBox: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  distanceText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  frequenciesContainer: {
    marginTop: spacing.xs,
  },
  frequenciesLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  frequenciesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  frequencyChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  frequencyText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  volmetNameBox: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  volmetNameLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
    marginRight: spacing.xs,
  },
  volmetNameText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  atisBox: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  atisLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
    marginRight: spacing.xs,
  },
  atisText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.warning,
  },
  sourceBox: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  sourceText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    textAlign: "center",
  },
  nearMeSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  nearMeToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  nearMeToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  nearMeToggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  nearMeToggleTextActive: {
    color: colors.textInverse,
  },
  radiusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  radiusInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
    minWidth: 80,
    textAlign: "center",
  },
  radiusSuffix: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  enableLocationText: {
    fontSize: typography.sizes.sm,
    color: colors.warning,
    textDecorationLine: "underline",
  },
});
