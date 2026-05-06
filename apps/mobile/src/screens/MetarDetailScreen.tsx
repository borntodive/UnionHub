import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, CloudRain } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography, borderRadius } from "../theme";
import { metarApi, WeatherResponse } from "../api/metar";
import { MetarCard } from "../components/MetarCard";
import { WindComponentCard } from "../components/WindComponentCard";
import { useMetarStore } from "../store/metarStore";
import { useOfflineStore } from "../store/offlineStore";
import {
  formatWind,
  getMetarValidityColor,
  getMetarAgeLabel,
  getTafExpiryLabel,
  getTafValidityColor,
} from "../utils/metar";

type MetarDetailRouteParams = {
  MetarDetail: { icao: string };
};

export const MetarDetailScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { icao } = route.params as MetarDetailRouteParams["MetarDetail"];

  const [showDecoded, setShowDecoded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isOnline = useOfflineStore((state) => state.isOnline);
  const { getRunways, setRunways } = useMetarStore();

  // Sync runways when component mounts if online and not cached
  useEffect(() => {
    const syncRunwaysIfNeeded = async () => {
      const cached = getRunways(icao);
      if (isOnline && cached.length === 0) {
        try {
          const synced = await metarApi.syncRunways(icao);
          if (synced && synced.length > 0) {
            setRunways(icao, synced);
          }
        } catch (e) {
          console.warn("Failed to sync runways:", e);
        }
      }
    };

    syncRunwaysIfNeeded();
  }, [icao, isOnline]);

  const {
    data: weather,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["weather", icao],
    queryFn: () => metarApi.getWeather(icao),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
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
          <Text style={styles.headerTitle}>{icao}</Text>
          <View style={styles.placeholder} />
        </View>
      </SafeAreaView>

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
        ) : !weather?.metar ? (
          <View style={styles.errorContainer}>
            <CloudRain size={48} color={colors.textTertiary} />
            <Text style={styles.errorText}>{t("metar.notFound")}</Text>
          </View>
        ) : (
          <>
            {/* Validity info bar */}
            <View style={styles.validityBar}>
              <View style={styles.validityItem}>
                <Text style={styles.validityLabel}>METAR:</Text>
                <View
                  style={[
                    styles.validityBadge,
                    {
                      backgroundColor: getMetarValidityColor(
                        weather.metar.decoded.time,
                      ),
                    },
                  ]}
                >
                  <Text style={styles.validityText}>
                    {getMetarAgeLabel(weather.metar.decoded.time)}
                  </Text>
                </View>
              </View>

              {weather.taf && (
                <View style={styles.validityItem}>
                  <Text style={styles.validityLabel}>TAF:</Text>
                  <View
                    style={[
                      styles.validityBadge,
                      {
                        backgroundColor: getTafValidityColor(
                          weather.taf.decoded.validUntil,
                        ),
                      },
                    ]}
                  >
                    <Text style={styles.validityText}>
                      {getTafExpiryLabel(weather.taf.decoded.validUntil)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* METAR Card */}
            <MetarCard
              metar={weather.metar}
              showDecoded={showDecoded}
              onToggle={() => setShowDecoded(!showDecoded)}
            />

            {/* TAF Section */}
            {weather.taf && (
              <View style={styles.tafContainer}>
                <View style={styles.tafHeader}>
                  <Text style={styles.tafTitle}>TAF</Text>
                  <TouchableOpacity
                    style={styles.expandButton}
                    onPress={() => setShowDecoded(!showDecoded)}
                  >
                    <Text style={styles.expandButtonText}>
                      {showDecoded ? "Show Raw" : "Show Decoded"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {!showDecoded ? (
                  <Text style={styles.tafRaw}>{weather.taf.raw}</Text>
                ) : (
                  <View style={styles.tafDecoded}>
                    <Text style={styles.tafStation}>
                      Station: {weather.taf.decoded.station}
                    </Text>
                    <Text style={styles.tafValid}>
                      Valid from:{" "}
                      {new Date(weather.taf.decoded.validFrom).toLocaleString()}{" "}
                      until{" "}
                      {new Date(
                        weather.taf.decoded.validUntil,
                      ).toLocaleString()}
                    </Text>

                    {weather.taf.decoded.forecasts.map((forecast, index) =>
                      forecast.time ||
                      forecast.wind ||
                      forecast.visibility ||
                      forecast.clouds ? (
                        <View key={index} style={styles.forecastItem}>
                          {forecast.time && (
                            <Text style={styles.forecastTime}>
                              From: {new Date(forecast.time).toLocaleString()}
                            </Text>
                          )}
                          {forecast.wind && (
                            <Text style={styles.forecastWind}>
                              Wind: {formatWind(forecast.wind)}
                            </Text>
                          )}
                          {forecast.visibility && (
                            <Text style={styles.forecastVis}>
                              Visibility: {forecast.visibility}m
                            </Text>
                          )}
                          {forecast.clouds && forecast.clouds.length > 0 && (
                            <Text style={styles.forecastClouds}>
                              Clouds:{" "}
                              {forecast.clouds
                                .map(
                                  (c) =>
                                    `${c.amount}${c.height ? ` ${Math.round(c.height)}ft` : ""}`,
                                )
                                .join(", ")}
                            </Text>
                          )}
                        </View>
                      ) : null,
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Wind Components */}
            {weather.windComponents && weather.windComponents.length > 0 && (
              <WindComponentCard
                windComponents={weather.windComponents}
                runwayInUse={weather.runwayInUse}
              />
            )}

            {/* Runway Info */}
            {weather.runways && weather.runways.length > 0 && (
              <View style={styles.runwaysContainer}>
                <Text style={styles.runwaysTitle}>Runways</Text>
                {weather.runways.map((rw, i) => (
                  <View key={i} style={styles.runwayItem}>
                    <Text style={styles.runwayNumber}>{rw.number}</Text>
                    <Text style={styles.runwayDetails}>
                      H: {rw.heading}° | L: {rw.length}ft
                      {rw.surface && ` | ${rw.surface}`}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  placeholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  errorText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  validityBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  validityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  validityLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  validityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  validityText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  tafContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tafHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  tafTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  expandButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  expandButtonText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  tafRaw: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontFamily: "monospace",
  },
  tafDecoded: {
    gap: spacing.sm,
  },
  tafStation: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  tafValid: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  forecastItem: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  forecastTime: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  forecastWind: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  forecastVis: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  forecastClouds: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  runwaysContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  runwaysTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  runwayItem: {
    flexDirection: "row",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  runwayNumber: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    width: 60,
  },
  runwayDetails: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
});
