import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, spacing, typography } from '../../../theme';

interface SbhPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const SbhPicker: React.FC<SbhPickerProps> = ({ value, onChange }) => {
  const [hours, minutes] = value.split(':').map((v) => parseInt(v) || 0);

  const hourItems = Array.from({ length: 151 }, (_, i) => ({
    label: `${i}h`,
    value: i,
  }));

  const minuteItems = Array.from({ length: 60 }, (_, i) => ({
    label: `${i.toString().padStart(2, '0')}m`,
    value: i,
  }));

  const handleHourChange = (h: number) => {
    onChange(`${h.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
  };

  const handleMinuteChange = (m: number) => {
    onChange(`${hours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Scheduled Block Hours</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={hours}
          onValueChange={handleHourChange}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          {hourItems.map((item) => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
        <Picker
          selectedValue={minutes}
          onValueChange={handleMinuteChange}
          style={styles.picker}
          itemStyle={styles.pickerItem}
        >
          {minuteItems.map((item) => (
            <Picker.Item key={item.value} label={item.label} value={item.value} />
          ))}
        </Picker>
      </View>
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
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  picker: {
    flex: 1,
    height: 120,
  },
  pickerItem: {
    fontSize: typography.sizes.base,
    color: colors.text,
  },
});
