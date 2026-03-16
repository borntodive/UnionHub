import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fingerprint, Trash2, Globe, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { setLanguage, getLanguage } from '../../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
];

export const SettingsScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { biometricEnabled, disableBiometric } = useAuthStore();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const currentLanguage = getLanguage();

  const handleDisableBiometric = () => {
    Alert.alert(
      t('settings.disableBiometricConfirm'),
      t('settings.disableBiometricConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            disableBiometric();
            Alert.alert(t('common.success'), t('settings.biometricAuth') + ' ' + t('settings.disabled'));
          }
        }
      ]
    );
  };

  const handleLanguageChange = async (langCode: string) => {
    await setLanguage(langCode);
    setShowLanguageModal(false);
  };

  const getCurrentLanguageLabel = () => {
    return LANGUAGES.find(l => l.code === currentLanguage)?.label || 'English';
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
          
          <TouchableOpacity 
            style={styles.card}
            onPress={() => setShowLanguageModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.row}>
              <View style={styles.iconContainer}>
                <Globe size={24} color={colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.label}>{t('settings.selectLanguage')}</Text>
                <Text style={styles.value}>{getCurrentLanguageLabel()}</Text>
              </View>
              <ChevronRight size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Language Selector Modal */}
          {showLanguageModal && (
            <View style={styles.languageModal}>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    currentLanguage === lang.code && styles.languageOptionActive
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={[
                    styles.languageOptionText,
                    currentLanguage === lang.code && styles.languageOptionTextActive
                  ]}>
                    {lang.label}
                  </Text>
                  {currentLanguage === lang.code && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.security')}</Text>
          
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconContainer}>
                <Fingerprint size={24} color={colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.label}>{t('settings.biometricAuth')}</Text>
                <Text style={styles.value}>
                  {biometricEnabled ? t('auth.biometricEnabled') : t('auth.biometricDisabled')}
                </Text>
              </View>
              {biometricEnabled && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleDisableBiometric}
                >
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
            
            {biometricEnabled && (
              <TouchableOpacity
                style={styles.disableButton}
                onPress={handleDisableBiometric}
              >
                <Text style={styles.disableButtonText}>
                  {t('settings.disableAndDelete')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.info')}</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('settings.version')}</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('settings.build')}</Text>
              <Text style={styles.infoValue}>2025.03.16</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  value: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actionButton: {
    padding: spacing.sm,
  },
  disableButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  disableButtonText: {
    fontSize: typography.sizes.base,
    color: colors.error,
    fontWeight: typography.weights.medium,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  infoLabel: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  bottomSpace: {
    height: spacing.xl,
  },
  languageModal: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  languageOptionActive: {
    backgroundColor: colors.primary + '10',
  },
  languageOptionText: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
  languageOptionTextActive: {
    fontWeight: typography.weights.semibold,
    color: colors.primary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: colors.textInverse,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
});

export default SettingsScreen;
