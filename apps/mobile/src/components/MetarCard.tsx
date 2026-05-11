import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  Plane,
  Wind,
  Eye,
  Cloud,
  Thermometer,
  TrendingUp,
} from "lucide-react-native";
import { spacing, typography, borderRadius } from "../theme";
import { colors } from "../theme";
import { Metar, FlightCategory, TrendType } from "../api/metar";
import {
  getFlightCategoryColor,
  getFlightCategoryLabel,
  formatVisibility,
  formatClouds,
  formatWind,
  isBadWeatherPhenomenon,
  formatUTCDate,
} from "../utils/metar";

interface MetarCardProps {
  metar: Metar;
  showDecoded: boolean;
  onToggle: () => void;
}

export const MetarCard: React.FC<MetarCardProps> = ({
  metar,
  showDecoded,
  onToggle,
}) => {
  const categoryColor = getFlightCategoryColor(metar.decoded.flightCategory);
  const categoryLabel = getFlightCategoryLabel(metar.decoded.flightCategory);

  const getTrendColor = (type?: TrendType) => ({
    backgroundColor:
      type === TrendType.TEMPO
        ? "#FF9500"
        : type === TrendType.BECMG
          ? "#007AFF"
          : type === TrendType.NOSIG
            ? "#34C759"
            : type === TrendType.PROB
              ? "#AF52DE"
              : type === TrendType.INTER
                ? "#8E8E93"
                : type === TrendType.FM
                  ? "#34C759"
                  : colors.background,
  });

  const renderHighlight = (text: string, isBad: boolean) => (
    <Text style={[styles.valueText, isBad && styles.badWeather]}>{text}</Text>
  );

  const renderRawMetar = () => {
    const raw = metar.raw;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Highlight bad weather phenomena
    const badPatterns = [
      /CB/g,
      /TCU/g,
      /TS[A-Z]*/g,
      /WS/g,
      /GR/g,
      /FZRA/g,
      /SS/g,
      /DS/g,
    ];

    // For simplicity, just show the raw with basic highlighting
    let highlighted = raw;
    badPatterns.forEach((pattern) => {
      highlighted = highlighted.replace(pattern, (match) => `__${match}__`);
    });

    const segments = highlighted.split("__");
    segments.forEach((seg, i) => {
      const isHighlight = badPatterns.some((p) => p.test(seg));
      parts.push(
        <Text
          key={i}
          style={[styles.rawText, isHighlight && styles.badWeather]}
        >
          {seg}
        </Text>,
      );
    });

    return (
      <View style={styles.rawContainer}>
        <Text style={styles.rawText}>{parts}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.card, { borderLeftColor: categoryColor }]}>
      {/* Header with toggle */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Plane size={20} color={categoryColor} />
          <Text style={styles.icao}>{metar.icao}</Text>
          <View
            style={[styles.categoryBadge, { backgroundColor: categoryColor }]}
          >
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onToggle} style={styles.toggleButton}>
          <Text style={styles.toggleText}>
            {showDecoded ? "Raw" : "Decoded"}
          </Text>
        </TouchableOpacity>
      </View>

      {showDecoded ? (
        /* Decoded view */
        <View style={styles.decodedContainer}>
          {/* Wind */}
          <View style={styles.windContainer}>
            <Wind
              size={16}
              color={colors.textSecondary}
              style={styles.rowIcon}
            />
            <Text style={styles.label}>Wind:</Text>
            <View style={styles.windDetails}>
              {renderHighlight(
                formatWind(metar.decoded.wind),
                (metar.decoded.wind?.speed ?? 0) > 25,
              )}
              {metar.decoded.wind?.gust && (
                <Text style={styles.gustText}>
                  {" "}
                  (gusting {Math.round(metar.decoded.wind.gust)}kt)
                </Text>
              )}
              {metar.decoded.wind?.isVariable &&
                metar.decoded.wind.variableFrom !== undefined &&
                metar.decoded.wind.variableTo !== undefined && (
                  <Text style={styles.variationText}>
                    variabile da {metar.decoded.wind.variableFrom}° a{" "}
                    {metar.decoded.wind.variableTo}°
                  </Text>
                )}
            </View>
          </View>

          {/* Visibility */}
          <View style={styles.row}>
            <Eye
              size={16}
              color={colors.textSecondary}
              style={styles.rowIcon}
            />
            <Text style={styles.label}>Visibility:</Text>
            {renderHighlight(
              formatVisibility(metar.decoded.visibility),
              (metar.decoded.visibility?.value ?? 99999) < 4800,
            )}
          </View>

          {/* Clouds */}
          <View style={styles.row}>
            <Cloud
              size={16}
              color={colors.textSecondary}
              style={styles.rowIcon}
            />
            <Text style={styles.label}>Clouds:</Text>
            <View style={styles.cloudsContainer}>
              {metar.decoded.clouds?.map((c, i) => (
                <Text
                  key={i}
                  style={[
                    styles.cloudText,
                    isBadWeatherPhenomenon(c.type) && styles.badWeather,
                  ]}
                >
                  {i > 0 && " "}
                  {c.amount}
                  {c.height && ` ${Math.round(c.height)}ft`}
                  {c.type && ` ${c.type}`}
                </Text>
              ))}
              {!metar.decoded.clouds || metar.decoded.clouds.length === 0 ? (
                <Text style={styles.valueText}>CLR</Text>
              ) : null}
            </View>
          </View>

          {/* Temperature/Dewpoint */}
          {metar.decoded.temperature !== undefined && (
            <View style={styles.row}>
              <Thermometer
                size={16}
                color={colors.textSecondary}
                style={styles.rowIcon}
              />
              <Text style={styles.label}>Temp/Dewpoint:</Text>
              <Text style={styles.valueText}>
                {metar.decoded.temperature}°/{metar.decoded.dewpoint ?? "-"}°C
              </Text>
            </View>
          )}

          {/* Altimeter */}
          {metar.decoded.altimeter && (
            <View style={styles.row}>
              <Text style={styles.label}>QNH:</Text>
              <Text style={styles.valueText}>
                {Math.round(metar.decoded.altimeter)} hPa
              </Text>
            </View>
          )}

          {/* Remarks */}
          {metar.decoded.remarks && (
            <View style={styles.remarksContainer}>
              <Text style={styles.remarksLabel}>Remarks:</Text>
              <Text style={styles.remarksText}>{metar.decoded.remarks}</Text>
            </View>
          )}

          {/* Trends */}
          {metar.decoded.trends && metar.decoded.trends.length > 0 && (
            <View style={styles.trendsContainer}>
              <View style={styles.trendsHeader}>
                <TrendingUp
                  size={14}
                  color={colors.textSecondary}
                  style={styles.rowIcon}
                />
                <Text style={styles.trendsLabel}>Trend:</Text>
              </View>
              {metar.decoded.trends.map((trend, i) => (
                <View key={i} style={styles.trendItem}>
                  {trend.type && (
                    <View
                      style={[styles.trendBadge, getTrendColor(trend.type)]}
                    >
                      <Text style={styles.trendBadgeText}>{trend.type}</Text>
                    </View>
                  )}
                  {trend.wind && (
                    <Text style={styles.trendDetail}>
                      Wind: {formatWind(trend.wind)}
                    </Text>
                  )}
                  {trend.visibility !== undefined && (
                    <Text style={styles.trendDetail}>
                      Vis: {trend.visibility}m
                    </Text>
                  )}
                  {trend.clouds && trend.clouds.length > 0 && (
                    <Text style={styles.trendDetail}>
                      Clouds:{" "}
                      {trend.clouds
                        .map(
                          (c) =>
                            `${c.amount}${c.height ? ` ${Math.round(c.height)}ft` : ""}`,
                        )
                        .join(", ")}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        /* Raw view */
        renderRawMetar()
      )}

      {/* Time */}
      <Text style={styles.timeText}>
        Observed: {formatUTCDate(metar.decoded.time)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  icao: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
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
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  decodedContainer: {
    gap: spacing.sm,
  },
  rawContainer: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    fontFamily: "monospace",
  },
  rawText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontFamily: "monospace",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  windContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  windDetails: {
    flex: 1,
    flexDirection: "column",
  },
  rowIcon: {
    marginRight: spacing.sm,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  valueText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  badWeather: {
    color: colors.error,
    fontWeight: typography.weights.bold,
  },
  gustText: {
    fontSize: typography.sizes.sm,
    color: colors.warning,
  },
  variationText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cloudsContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cloudText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  remarksContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  remarksLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  remarksText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  trendsContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  trendsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  trendsLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  trendItem: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.xs,
  },
  trendBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  trendBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  trendDetail: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});
