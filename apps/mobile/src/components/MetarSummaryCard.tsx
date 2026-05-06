import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Plane, Wind, Eye, Clock } from "lucide-react-native";
import { spacing, typography, borderRadius } from "../theme";
import { colors } from "../theme";
import { Metar, FlightCategory } from "../api/metar";
import {
  getFlightCategoryColor,
  getFlightCategoryLabel,
  formatWind,
  formatVisibility,
  getMetarValidityColor,
  getMetarAgeLabel,
  getTafExpiryLabel,
  getTafValidityColor,
} from "../utils/metar";

interface MetarSummaryCardProps {
  icao: string;
  metar: Metar;
  tafExpiry?: Date | string;
  onPress: () => void;
}

export const MetarSummaryCard: React.FC<MetarSummaryCardProps> = ({
  icao,
  metar,
  tafExpiry,
  onPress,
}) => {
  const categoryColor = getFlightCategoryColor(metar.decoded.flightCategory);
  const categoryLabel = getFlightCategoryLabel(metar.decoded.flightCategory);
  const validityColor = getMetarValidityColor(metar.decoded.time);
  const ageLabel = getMetarAgeLabel(metar.decoded.time);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Plane size={18} color={categoryColor} />
          <Text style={styles.icao}>{icao}</Text>
          <View
            style={[styles.categoryBadge, { backgroundColor: categoryColor }]}
          >
            <Text style={styles.categoryText}>{categoryLabel}</Text>
          </View>
        </View>
        <View
          style={[styles.validityBadge, { backgroundColor: validityColor }]}
        >
          <Clock size={12} color={colors.textInverse} />
          <Text style={styles.validityText}>{ageLabel}</Text>
        </View>
      </View>

      {/* Weather summary */}
      <View style={styles.summary}>
        {/* Wind */}
        <View style={styles.summaryItem}>
          <Wind size={14} color={colors.textSecondary} />
          <Text style={styles.summaryText}>
            {formatWind(metar.decoded.wind)}
          </Text>
        </View>

        {/* Visibility */}
        <View style={styles.summaryItem}>
          <Eye size={14} color={colors.textSecondary} />
          <Text style={styles.summaryText}>
            {formatVisibility(metar.decoded.visibility)}
          </Text>
        </View>

        {/* Clouds - brief */}
        {metar.decoded.clouds && metar.decoded.clouds.length > 0 && (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryText} numberOfLines={1}>
              {metar.decoded.clouds
                .slice(0, 2)
                .map((c) => c.amount)
                .join(" ")}
              {metar.decoded.clouds.length > 2 && "..."}
            </Text>
          </View>
        )}
      </View>

      {/* TAF expiry if available */}
      {tafExpiry && (
        <View style={styles.tafRow}>
          <Text style={styles.tafLabel}>TAF:</Text>
          <View
            style={[
              styles.tafExpiryBadge,
              { backgroundColor: getTafValidityColor(tafExpiry) },
            ]}
          >
            <Text style={styles.tafExpiryText}>
              {getTafExpiryLabel(tafExpiry)}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  icao: {
    fontSize: typography.sizes.md,
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
  validityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  validityText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textInverse,
  },
  summary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  summaryText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  tafRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  tafLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginRight: spacing.xs,
  },
  tafExpiryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tafExpiryText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.textInverse,
  },
});
