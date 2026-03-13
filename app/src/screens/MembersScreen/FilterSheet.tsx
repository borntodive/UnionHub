import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { X } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { Base, Contract, Grade, Ruolo, UserRole } from '../../types';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  
  // User role
  userRole?: UserRole;
  userRuolo?: Ruolo | null;
  
  // Data options (filtered by role)
  bases: Base[];
  contracts: Contract[];
  grades: Grade[];
  
  // Selected values
  selectedRuolo?: Ruolo;
  selectedBaseId?: string;
  selectedContrattoId?: string;
  selectedGradeId?: string;
  
  // Setters
  onSelectRuolo: (ruolo?: Ruolo) => void;
  onSelectBase: (baseId?: string) => void;
  onSelectContratto: (contrattoId?: string) => void;
  onSelectGrade: (gradeId?: string) => void;
  onReset: () => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  onClose,
  userRole,
  userRuolo,
  bases,
  contracts,
  grades,
  selectedRuolo,
  selectedBaseId,
  selectedContrattoId,
  selectedGradeId,
  onSelectRuolo,
  onSelectBase,
  onSelectContratto,
  onSelectGrade,
  onReset,
}) => {
  const isSuperAdmin = userRole === UserRole.SUPERADMIN;
  
  // Filter contracts and grades based on user role
  const filteredContracts = isSuperAdmin 
    ? contracts 
    : contracts.filter(c => {
        if (userRuolo === Ruolo.PILOT) {
          return c.codice.includes('PI') || c.codice === 'AFA' || c.codice === 'Contractor' || c.codice === 'DAC';
        }
        if (userRuolo === Ruolo.CABIN_CREW) {
          return c.codice.includes('CC') || c.codice === 'CrewLink';
        }
        return true;
      });
  
  const filteredGrades = isSuperAdmin
    ? grades
    : grades.filter(g => g.ruolo === userRuolo);

  const hasActiveFilters = selectedRuolo || selectedBaseId || selectedContrattoId || selectedGradeId;

  // Build options for each select
  const ruoloOptions = [
    { label: 'All', value: '' },
    { label: 'Pilots', value: Ruolo.PILOT },
    { label: 'Cabin Crew', value: Ruolo.CABIN_CREW },
  ];

  const baseOptions = [
    { label: 'All', value: '' },
    ...(bases || []).map(b => ({ label: b.codice, value: b.id })),
  ];

  const contractOptions = [
    { label: 'All', value: '' },
    ...(filteredContracts || []).map(c => ({
      label: isSuperAdmin ? c.codice : c.codice.replace(/-(PI|CC)$/, ''),
      value: c.id,
    })),
  ];

  const gradeOptions = [
    { label: 'All', value: '' },
    ...(filteredGrades || []).map(g => ({ label: g.codice, value: g.id })),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Role - Only for SuperAdmin */}
            {isSuperAdmin && (
              <Select
                label="Role"
                value={selectedRuolo}
                onValueChange={(val) => onSelectRuolo(val as Ruolo || undefined)}
                options={ruoloOptions}
                placeholder="Select role..."
              />
            )}

            {/* Base */}
            <Select
              label="Base"
              value={selectedBaseId}
              onValueChange={onSelectBase}
              options={baseOptions}
              placeholder="Select base..."
            />

            {/* Contract */}
            <Select
              label="Contract"
              value={selectedContrattoId}
              onValueChange={onSelectContratto}
              options={contractOptions}
              placeholder="Select contract..."
            />

            {/* Grade */}
            <Select
              label="Grade"
              value={selectedGradeId}
              onValueChange={onSelectGrade}
              options={gradeOptions}
              placeholder="Select grade..."
            />

            <View style={styles.footerSpacer} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {hasActiveFilters && (
              <Button
                title="Reset Filters"
                onPress={onReset}
                variant="ghost"
                size="md"
                style={styles.resetButton}
              />
            )}
            <Button
              title="Apply"
              onPress={onClose}
              size="md"
              style={styles.applyButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  footerSpacer: {
    height: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    flex: 1,
  },
  applyButton: {
    flex: 2,
  },
});
