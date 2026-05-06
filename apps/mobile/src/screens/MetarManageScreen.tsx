import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Check,
  RefreshCw,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography, borderRadius } from "../theme";
import { volmetApi, Volmet } from "../api/volmet";
import { metarApi } from "../api/metar";
import { useMetarStore } from "../store/metarStore";

export const MetarManageScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { savedIcaos, addIcao, removeIcao } = useMetarStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredVolmets, setFilteredVolmets] = useState<Volmet[]>([]);
  const [syncing, setSyncing] = useState(false);

  const { data: volmets, isLoading } = useQuery({
    queryKey: ["volmets"],
    queryFn: () => volmetApi.getAll(true),
    staleTime: 1000 * 60 * 60,
  });

  React.useEffect(() => {
    if (!volmets || !searchQuery.trim()) {
      setFilteredVolmets(volmets ?? []);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = volmets.filter(
      (v) =>
        v.icao.toLowerCase().includes(query) ||
        (v.iata && v.iata.toLowerCase().includes(query)) ||
        v.name.toLowerCase().includes(query) ||
        v.city.toLowerCase().includes(query),
    );

    setFilteredVolmets(filtered);
  }, [volmets, searchQuery]);

  const toggleAirport = (icao: string) => {
    if (savedIcaos.includes(icao)) {
      removeIcao(icao);
    } else {
      addIcao(icao);
    }
  };

  const isSaved = (icao: string) => savedIcaos.includes(icao);

  const handleBulkSync = async () => {
    if (savedIcaos.length === 0) {
      Alert.alert(t("metar.syncNoAirports"));
      return;
    }

    setSyncing(true);
    try {
      const result = await metarApi.bulkSyncRunways(savedIcaos);
      if (result) {
        Alert.alert(
          t("metar.syncComplete"),
          t("metar.syncResult", {
            added: result.added,
            errors: result.errors.length,
          }),
        );
      }
    } catch (error) {
      Alert.alert(t("metar.syncError"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("Metar")}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("metar.manageTitle")}</Text>
          <TouchableOpacity
            style={[
              styles.headerButton,
              syncing && styles.headerButtonDisabled,
            ]}
            onPress={handleBulkSync}
            disabled={syncing || savedIcaos.length === 0}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <RefreshCw
                size={24}
                color={
                  savedIcaos.length > 0
                    ? colors.textInverse
                    : colors.textTertiary
                }
              />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

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
          placeholder={t("metar.searchPlaceholder")}
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
        />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {filteredVolmets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? t("metar.noResults")
                  : t("metar.noAirports")}
              </Text>
            </View>
          ) : (
            filteredVolmets.map((volmet) => {
              const saved = isSaved(volmet.icao);
              return (
                <TouchableOpacity
                  key={volmet.id}
                  style={[styles.airportItem, saved && styles.airportItemSaved]}
                  onPress={() => toggleAirport(volmet.icao)}
                  activeOpacity={0.7}
                >
                  <View style={styles.airportInfo}>
                    <View
                      style={[styles.icaoBox, saved && styles.icaoBoxSaved]}
                    >
                      <Text style={[styles.icao, saved && styles.icaoSaved]}>
                        {volmet.icao}
                      </Text>
                    </View>
                    <View style={styles.airportDetails}>
                      <Text style={styles.airportName}>{volmet.name}</Text>
                      <Text style={styles.airportLocation}>
                        {volmet.city}, {volmet.country}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.actionButton,
                      saved && styles.actionButtonSaved,
                    ]}
                  >
                    {saved ? (
                      <Minus size={18} color={colors.textInverse} />
                    ) : (
                      <Plus size={18} color={colors.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Saved count */}
      {savedIcaos.length > 0 && (
        <View style={styles.savedCountBar}>
          <Check size={16} color={colors.textInverse} />
          <Text style={styles.savedCountText}>
            {savedIcaos.length} {t("metar.savedCount")}
          </Text>
        </View>
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
  backButton: {
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    height: 48,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  airportItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  airportItemSaved: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  airportInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icaoBox: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  icaoBoxSaved: {
    backgroundColor: colors.primary,
  },
  icao: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  icaoSaved: {
    color: colors.textInverse,
  },
  airportDetails: {
    flex: 1,
  },
  airportName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  airportLocation: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonSaved: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  savedCountBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  savedCountText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textInverse,
  },
});
