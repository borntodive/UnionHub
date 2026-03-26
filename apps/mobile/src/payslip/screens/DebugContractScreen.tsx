import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePayslipStore } from "../store/usePayslipStore";
import { useAuthStore } from "../../store/authStore";
import { fetchClaContract } from "../services/claContractsApi";
import { getContractData as getStaticContractData } from "../data/contractData";
import { colors, spacing, typography } from "../../theme";

export default function DebugContractScreen() {
  const { settings, input } = usePayslipStore();
  const { user } = useAuthStore();
  const [dbContract, setDbContract] = useState<any>(null);
  const [staticContract, setStaticContract] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadContracts = async () => {
    setLoading(true);
    try {
      // Fetch from database
      const date = new Date(input.date);
      const dbResult = await fetchClaContract(
        settings.company,
        settings.role,
        settings.rank,
        date.getFullYear(),
        date.getMonth() + 1,
      );
      setDbContract(dbResult);

      // Fetch static data
      const staticResult = getStaticContractData(
        settings.company,
        settings.role,
        settings.rank,
      );
      setStaticContract(staticResult);
    } catch (error) {
      console.error("Error fetching contracts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, [settings.company, settings.role, settings.rank, input.date]);

  const renderContractData = (title: string, contract: any, isDb: boolean) => {
    if (!contract) {
      return (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.notFound}>Contract not found</Text>
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {title}{" "}
          {isDb && contract.id && <Text style={styles.dbBadge}>DB</Text>}
        </Text>

        {isDb && (
          <View style={styles.row}>
            <Text style={styles.label}>Contract ID:</Text>
            <Text style={styles.value}>{contract.id || "N/A"}</Text>
          </View>
        )}

        <View style={styles.row}>
          <Text style={styles.label}>Source:</Text>
          <Text
            style={[styles.value, isDb ? styles.dbSource : styles.staticSource]}
          >
            {isDb ? "Database" : "Static File"}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Company:</Text>
          <Text style={styles.value}>
            {contract.company || settings.company}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Role:</Text>
          <Text style={styles.value}>{contract.role || settings.role}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Rank:</Text>
          <Text style={styles.value}>{contract.rank || settings.rank}</Text>
        </View>

        {isDb && contract.effectiveYear && (
          <View style={styles.row}>
            <Text style={styles.label}>Effective:</Text>
            <Text style={styles.value}>
              {contract.effectiveMonth}/{contract.effectiveYear}
              {contract.endYear &&
                ` - ${contract.endMonth}/${contract.endYear}`}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.subSectionTitle}>Salary Components (Monthly)</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Basic:</Text>
          <Text style={styles.value}>
            €{Number(contract.basic || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>FFP:</Text>
          <Text style={styles.value}>
            €{Number(contract.ffp || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Allowance:</Text>
          <Text style={styles.value}>
            €{Number(contract.allowance || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>SBH:</Text>
          <Text style={styles.value}>
            €{Number(contract.sbh || 0).toFixed(4)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>AL:</Text>
          <Text style={styles.value}>
            €{Number(contract.al || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>WOFF:</Text>
          <Text style={styles.value}>
            €{Number(contract.woff || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>OOB:</Text>
          <Text style={styles.value}>
            €{Number(contract.oob || 0).toFixed(2)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Diaria:</Text>
          <Text style={styles.value}>
            €{Number(contract.diaria || 0).toFixed(4)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>RSA:</Text>
          <Text style={styles.value}>
            €{Number(contract.rsa || 0).toFixed(2)}
          </Text>
        </View>

        {contract.trainingConfig && (
          <>
            <View style={styles.divider} />
            <Text style={styles.subSectionTitle}>Training Config</Text>
            <Text style={styles.json}>
              {JSON.stringify(contract.trainingConfig, null, 2)}
            </Text>
          </>
        )}

        {isDb && contract.version && (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>Version:</Text>
              <Text style={styles.value}>v{contract.version}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Active:</Text>
              <Text style={styles.value}>
                {contract.isActive ? "Yes" : "No"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Updated:</Text>
              <Text style={styles.value}>
                {contract.updatedAt
                  ? new Date(contract.updatedAt).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadContracts} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Contract Debug</Text>
          <Text style={styles.subtitle}>
            {settings.company} / {settings.role} / {settings.rank}
          </Text>
          <Text style={styles.date}>
            Date: {new Date(input.date).toLocaleDateString()}
          </Text>
        </View>

        {renderContractData("Database Contract", dbContract, true)}

        <View style={styles.spacer} />

        {renderContractData(
          "Static Contract (Fallback)",
          staticContract,
          false,
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pull down to refresh • Only visible to SuperAdmin
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "bold",
    color: colors.textInverse,
  },
  subtitle: {
    fontSize: typography.sizes.md,
    color: colors.textInverse,
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  date: {
    fontSize: typography.sizes.sm,
    color: colors.textInverse,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  section: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.md,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  subSectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  dbBadge: {
    backgroundColor: colors.success,
    color: colors.textInverse,
    fontSize: typography.sizes.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  value: {
    fontSize: typography.sizes.sm,
    color: colors.text,
    fontWeight: "500",
  },
  dbSource: {
    color: colors.success,
    fontWeight: "bold",
  },
  staticSource: {
    color: colors.warning,
    fontWeight: "bold",
  },
  notFound: {
    fontSize: typography.sizes.base,
    color: colors.error,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  spacer: {
    height: spacing.md,
  },
  json: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    fontFamily: "monospace",
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 4,
  },
  footer: {
    padding: spacing.md,
    alignItems: "center",
  },
  footerText: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
});
