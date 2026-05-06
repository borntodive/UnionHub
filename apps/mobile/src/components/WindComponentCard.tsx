import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ArrowDown, ArrowLeftRight } from "lucide-react-native";
import { spacing, typography, borderRadius } from "../theme";
import { colors } from "../theme";
import { WindComponent } from "../api/metar";

interface WindComponentCardProps {
  windComponents: WindComponent[];
  runwayInUse?: string;
}

export const WindComponentCard: React.FC<WindComponentCardProps> = ({
  windComponents,
  runwayInUse,
}) => {
  const getHeadwindColor = (headwind: number): string => {
    if (headwind >= 10) return "#166534"; // Dark green - good
    if (headwind >= 0) return "#ca8a04"; // Dark yellow - weak headwind
    return "#dc2626"; // Red - tailwind
  };

  const getCrosswindColor = (crosswind: number): string => {
    if (crosswind <= 10) return "#166534"; // Dark green - acceptable
    if (crosswind <= 20) return "#ca8a04"; // Dark yellow - moderate
    return "#dc2626"; // Red - strong crosswind
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Wind Components</Text>

      {runwayInUse && (
        <View style={styles.runwayInUseContainer}>
          <Text style={styles.runwayInUseLabel}>Runway in Use:</Text>
          <View style={styles.runwayBadge}>
            <Text style={styles.runwayInUseValue}>{runwayInUse}</Text>
          </View>
        </View>
      )}

      <View style={styles.tableHeader}>
        <Text style={styles.headerRunway}>RWY</Text>
        <Text style={styles.headerValue}>HDG</Text>
        <Text style={styles.headerArrow}>↕</Text>
        <Text style={styles.headerArrow}>↔</Text>
      </View>

      {windComponents.map((wc, index) => (
        <View key={index} style={styles.tableRow}>
          <Text
            style={[
              styles.runwayText,
              wc.runway === runwayInUse && styles.selectedRunwayText,
            ]}
          >
            {wc.runway}
          </Text>
          <Text style={styles.headingText}>{wc.heading}°</Text>

          {/* Headwind */}
          <View style={styles.windCell}>
            <Text
              style={[
                styles.windText,
                { color: getHeadwindColor(wc.headwindKnots) },
              ]}
            >
              {wc.headwindKnots > 0 ? "+" : ""}
              {wc.headwindKnots}
            </Text>
          </View>

          {/* Crosswind */}
          <View style={styles.windCell}>
            <Text
              style={[
                styles.windText,
                { color: getCrosswindColor(wc.crosswindKnots) },
              ]}
            >
              {wc.crosswindKnots}
              <Text
                style={[
                  styles.crosswindDir,
                  { color: getCrosswindColor(wc.crosswindKnots) },
                ]}
              >
                {" "}
                {wc.isCrosswindFrom}
              </Text>
            </Text>
          </View>
        </View>
      ))}

      <Text style={styles.legend}>
        ↕ = Headwind (kt) | ↔ = Crosswind (kt + L/R)
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  runwayInUseContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  runwayInUseLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
    marginRight: spacing.sm,
  },
  runwayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  runwayInUseValue: {
    fontSize: typography.sizes.sm,
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRunway: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
  },
  headerValue: {
    flex: 0.6,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textAlign: "center",
  },
  headerArrow: {
    flex: 0.7,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textTertiary,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedRow: {
    backgroundColor: colors.primaryLight,
  },
  runwayText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  selectedRunwayText: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  headingText: {
    flex: 0.6,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: "center",
  },
  windCell: {
    flex: 0.7,
    alignItems: "center",
  },
  windText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  crosswindDir: {
    fontSize: typography.sizes.xs,
  },
  legend: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: "center",
  },
});
