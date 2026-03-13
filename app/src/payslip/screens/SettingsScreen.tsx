import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { usePayslipStore } from '../store/usePayslipStore';
import { NumberInput } from '../components/input/NumberInput';

const RANKS_PILOT = ['tre', 'tri', 'ltc', 'lcc', 'cpt', 'sfi', 'fo', 'jfo', 'so'];
const RANKS_CC = ['sepe', 'sepi', 'pu', 'jpu', 'ju'];

export const SettingsScreen: React.FC = () => {
  const { settings, setSettings } = usePayslipStore();

  const ranks = settings.role === 'pil' ? RANKS_PILOT : RANKS_CC;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ruolo e Grado</Text>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[styles.roleButton, settings.role === 'pil' && styles.roleButtonActive]}
            onPress={() => setSettings({ role: 'pil', rank: 'fo' })}
          >
            <Text style={[styles.roleText, settings.role === 'pil' && styles.roleTextActive]}>
              Pilota
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, settings.role === 'cc' && styles.roleButtonActive]}
            onPress={() => setSettings({ role: 'cc', rank: 'sepe' })}
          >
            <Text style={[styles.roleText, settings.role === 'cc' && styles.roleTextActive]}>
              Cabin Crew
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ranksContainer}>
          {ranks.map((rank) => (
            <TouchableOpacity
              key={rank}
              style={[styles.rankButton, settings.rank === rank && styles.rankButtonActive]}
              onPress={() => setSettings({ rank })}
            >
              <Text style={[styles.rankText, settings.rank === rank && styles.rankTextActive]}>
                {rank.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Opzioni Contratto</Text>

        {settings.rank === 'cpt' && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>New Captain (CU)</Text>
            <Switch value={settings.cu} onValueChange={(v) => setSettings({ cu: v })} />
          </View>
        )}

        {(settings.rank === 'tri' || settings.rank === 'tre') && (
          <>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>BTC Based</Text>
              <Switch value={settings.btc} onValueChange={(v) => setSettings({ btc: v })} />
            </View>
            {settings.rank === 'tri' && (
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>LTC Position</Text>
                <Switch
                  value={settings.triAndLtc}
                  onValueChange={(v) => setSettings({ triAndLtc: v })}
                />
              </View>
            )}
          </>
        )}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Part-time</Text>
          <Switch value={settings.parttime} onValueChange={(v) => setSettings({ parttime: v })} />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Coniuge a Carico</Text>
          <Switch
            value={settings.coniugeCarico}
            onValueChange={(v) => setSettings({ coniugeCarico: v })}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detrazioni</Text>

        <NumberInput
          label="Quota Sindacale"
          value={settings.union}
          onChange={(union) => setSettings({ union })}
          suffix="€"
        />

        <NumberInput
          label="Contributo Volontario Pensione"
          value={settings.voluntaryPensionContribution}
          onChange={(voluntaryPensionContribution) => setSettings({ voluntaryPensionContribution })}
          suffix="%"
        />

        <NumberInput
          label="Addizionali Comunali"
          value={settings.addComunali}
          onChange={(addComunali) => setSettings({ addComunali })}
          suffix="%"
        />

        <NumberInput
          label="Addizionali Regionali"
          value={settings.addRegionali}
          onChange={(addRegionali) => setSettings({ addRegionali })}
          suffix="%"
        />
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
};

import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  roleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
  },
  roleText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  roleTextActive: {
    color: colors.textInverse,
  },
  ranksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rankButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rankButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rankText: {
    fontSize: typography.sizes.sm,
    color: colors.text,
  },
  rankTextActive: {
    color: colors.textInverse,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  switchLabel: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  bottomSpace: {
    height: spacing.xl,
  },
});
