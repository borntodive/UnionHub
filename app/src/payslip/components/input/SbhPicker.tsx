import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { Clock, X, Check } from 'lucide-react-native';
import { colors, spacing, typography, borderRadius } from '../../../theme';

interface SbhPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const SbhPicker: React.FC<SbhPickerProps> = ({ value, onChange }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempHours, setTempHours] = useState(0);
  const [tempMinutes, setTempMinutes] = useState(0);

  const [hours, minutes] = useMemo(() => {
    const [h, m] = value.split(':').map((v) => parseInt(v) || 0);
    return [h, m];
  }, [value]);

  const openModal = useCallback(() => {
    setTempHours(hours);
    setTempMinutes(minutes);
    setModalVisible(true);
  }, [hours, minutes]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  const handleConfirm = useCallback(() => {
    const newValue = `${tempHours.toString().padStart(2, '0')}:${tempMinutes.toString().padStart(2, '0')}`;
    onChange(newValue);
    setModalVisible(false);
  }, [tempHours, tempMinutes, onChange]);

  const hourItems = useMemo(() => 
    Array.from({ length: 151 }, (_, i) => i),
    []
  );

  const minuteItems = useMemo(() => 
    Array.from({ length: 60 }, (_, i) => i),
    []
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Scheduled Block Hours</Text>
      <TouchableOpacity style={styles.inputContainer} onPress={openModal}>
        <Clock size={20} color={colors.textSecondary} />
        <Text style={styles.valueText}>{value}</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={closeModal} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Hours</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewContainer}>
              <Text style={styles.previewText}>
                {tempHours.toString().padStart(2, '0')}:{tempMinutes.toString().padStart(2, '0')}
              </Text>
            </View>

            <View style={styles.pickersRow}>
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hours</Text>
                <ScrollView 
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                >
                  {hourItems.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.item,
                        tempHours === h && styles.itemSelected
                      ]}
                      onPress={() => setTempHours(h)}
                    >
                      <Text style={[
                        styles.itemText,
                        tempHours === h && styles.itemTextSelected
                      ]}>
                        {h.toString().padStart(2, '0')}
                      </Text>
                      {tempHours === h && (
                        <Check size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minutes</Text>
                <ScrollView 
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                >
                  {minuteItems.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.item,
                        tempMinutes === m && styles.itemSelected
                      ]}
                      onPress={() => setTempMinutes(m)}
                    >
                      <Text style={[
                        styles.itemText,
                        tempMinutes === m && styles.itemTextSelected
                      ]}>
                        {m.toString().padStart(2, '0')}
                      </Text>
                      {tempMinutes === m && (
                        <Check size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  valueText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  previewText: {
    fontSize: 48,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  pickersRow: {
    flexDirection: 'row',
    gap: spacing.md,
    height: 250,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  itemSelected: {
    backgroundColor: colors.primaryLight,
  },
  itemText: {
    fontSize: typography.sizes.lg,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  itemTextSelected: {
    color: colors.primary,
    fontWeight: typography.weights.semibold,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  confirmButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
});
