import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Star, CloudRain, Radio } from "lucide-react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { colors, spacing, typography, borderRadius } from "../theme";
import { metarApi } from "../api/metar";
import { volmetApi } from "../api/volmet";
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

type AirportDetailRouteParams = {
  AirportDetail: { icao: string; volmetId?: string; airportName?: string };
};

const MAX_SAVED_AIRPORTS = 10;

export const AirportDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { t } = useTranslation();
  const { icao, volmetId, airportName } =
    route.params as AirportDetailRouteParams["AirportDetail"];

  const [showDecoded, setShowDecoded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isOnline = useOfflineStore((state) => state.isOnline);
  const { savedIcaos, toggleIcao } = useMetarStore();
  const isSaved = savedIcaos.includes(icao.toUpperCase());

  const {
    data: weather,
    isLoading: weatherLoading,
    refetch: refetchWeather,
  } = useQuery({
    queryKey: ["weather", icao],
    queryFn: () => metarApi.getWeather(icao),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline,
  });

  const {
    data: volmet,
    isLoading: volmetLoading,
    refetch: refetchVolmet,
  } = useQuery({
    queryKey: ["volmet-detail", volmetId],
    queryFn: () => volmetApi.getById(volmetId!),
    staleTime: 1000 * 60 * 60,
    enabled: !!volmetId && isOnline,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchWeather(), refetchVolmet()]);
    setRefreshing(false);
  };

  const handleStarPress = () => {
    if (!isSaved && savedIcaos.length >= MAX_SAVED_AIRPORTS) {
      Alert.alert(t("airports.maxSavedTitle"), t("airports.maxSavedMessage"));
      return;
    }
    toggleIcao(icao);
  };

  const isLoading = weatherLoading || (!!volmetId && volmetLoading);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate("Airports")}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {airportName ? `${icao} · ${airportName}` : icao}
          </Text>
          <TouchableOpacity
            style={styles.starHeaderButton}
            onPress={handleStarPress}
          >
            <Star
              size={22}
              color={isSaved ? colors.warning : colors.textInverse}
              fill={isSaved ? colors.warning : "transparent"}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* VOLMET / Frequencies section */}
            {volmetId ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Radio size={18} color={colors.primary} />
                  <Text style={styles.sectionTitle}>
                    {t("airports.frequenciesSection")}
                  </Text>
                </View>

                {volmet ? (
                  <>
                    <View style={styles.frequenciesList}>
                      {volmet.frequencies.map((freq, idx) => (
                        <View key={idx} style={styles.frequencyChip}>
                          <Text style={styles.frequencyText}>{freq}</Text>
                        </View>
                      ))}
                    </View>

                    {volmet.volmetName && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoRowLabel}>VOLMET</Text>
                        <Text style={styles.infoRowValue}>
                          {volmet.volmetName}
                        </Text>
                      </View>
                    )}

                    {volmet.atis && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoRowLabel}>ATIS</Text>
                        <Text style={[styles.infoRowValue, styles.atisValue]}>
                          {volmet.atis}
                        </Text>
                      </View>
                    )}

                    {volmet.handlingFrequency && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoRowLabel}>
                          {t("airports.handling")}
                        </Text>
                        <Text style={styles.infoRowValue}>
                          {volmet.handlingFrequency}
                        </Text>
                      </View>
                    )}

                    {volmet.latitude != null && volmet.longitude != null && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoRowLabel}>
                          {volmet.city}, {volmet.country}
                        </Text>
                        <Text style={styles.infoRowValue}>
                          {Number(volmet.latitude).toFixed(4)}° /{" "}
                          {Number(volmet.longitude).toFixed(4)}°
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noDataText}>
                    {t("airports.noVolmetData")}
                  </Text>
                )}
              </View>
            ) : null}

            {/* Weather section */}
            {!isOnline ? null : !weather?.metar ? (
              <View style={styles.errorContainer}>
                <CloudRain size={48} color={colors.textTertiary} />
                <Text style={styles.errorText}>
                  {t("airports.noWeatherData")}
                </Text>
              </View>
            ) : (
              <>
                {/* Validity bar */}
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

                {/* METAR card */}
                <MetarCard
                  metar={weather.metar}
                  showDecoded={showDecoded}
                  onToggle={() => setShowDecoded(!showDecoded)}
                />

                {/* TAF section */}
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
                          {new Date(
                            weather.taf.decoded.validFrom,
                          ).toLocaleString()}{" "}
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
                                  From:{" "}
                                  {new Date(forecast.time).toLocaleString()}
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
                              {forecast.clouds &&
                                forecast.clouds.length > 0 && (
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
                {weather.windComponents &&
                  weather.windComponents.length > 0 && (
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
                          H: {rw.heading}°
                          {rw.length ? ` | L: ${rw.length}m` : ""}
                          {rw.surface && ` | ${rw.surface}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
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
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    textAlign: "center",
    marginHorizontal: spacing.sm,
  },
  starHeaderButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  frequenciesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  frequencyChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  frequencyText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    fontFamily: "monospace",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  infoRowLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontWeight: typography.weights.semibold,
  },
  infoRowValue: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  atisValue: {
    color: colors.warning,
  },
  noDataText: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    fontStyle: "italic",
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  errorText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: "center",
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
