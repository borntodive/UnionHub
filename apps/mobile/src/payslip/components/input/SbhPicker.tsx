import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Clock, X } from "lucide-react-native";
import { colors, spacing, typography, borderRadius } from "../../../theme";
import { useTranslation } from "react-i18next";

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);
const REPEAT = 10; // 10× is enough for a 0–150 hour range

const HOUR_ITEMS = Array.from({ length: 151 }, (_, i) => i); // 0–150
const MINUTE_ITEMS = Array.from({ length: 60 }, (_, i) => i); // 0–59

// ---------------------------------------------------------------------------

interface PickerColumnProps {
  items: number[];
  selected: number;
  onChange: (v: number) => void;
  label: string;
}

const PickerColumn: React.FC<PickerColumnProps> = ({
  items,
  selected,
  onChange,
  label,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  const extended = useMemo(
    () =>
      Array.from(
        { length: items.length * REPEAT },
        (_, i) => items[i % items.length],
      ),
    [items],
  );

  const initialIndex = Math.floor(REPEAT / 2) * items.length + selected;
  const [centeredIndex, setCenteredIndex] = useState(initialIndex);
  const [scrollOffsetY, setScrollOffsetY] = useState(
    initialIndex * ITEM_HEIGHT,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: initialIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      setScrollOffsetY(offsetY);
      const idx = Math.round(offsetY / ITEM_HEIGHT);
      setCenteredIndex(Math.max(0, Math.min(extended.length - 1, idx)));
    },
    [extended.length],
  );

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(extended.length - 1, idx));
      setCenteredIndex(clamped);
      onChange(items[clamped % items.length]);
    },
    [extended.length, items, onChange],
  );

  return (
    <View style={colStyles.wrapper}>
      <Text style={colStyles.label}>{label}</Text>
      <View style={colStyles.drum}>
        <View style={colStyles.selectionBand} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          contentContainerStyle={{ paddingVertical: PAD }}
          style={colStyles.scroll}
        >
          {extended.map((item, index) => {
            const isCenter = index === centeredIndex;

            return (
              <View key={index} style={colStyles.item}>
                <Text
                  style={[
                    colStyles.itemText,
                    isCenter && colStyles.itemTextSelected,
                  ]}
                >
                  {String(item).padStart(2, "0")}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const colStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  drum: {
    width: "100%",
    height: PICKER_HEIGHT,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
  },
  selectionBand: {
    position: "absolute",
    top: PAD,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    zIndex: 0,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  itemText: {
    fontSize: typography.sizes.xl ?? 22,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
    fontWeight: typography.weights.medium,
  },
  itemTextSelected: {
    color: colors.surfaceVariant,
    fontWeight: typography.weights.bold,
  },
});

// ---------------------------------------------------------------------------

interface SbhPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const SbhPicker: React.FC<SbhPickerProps> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const [hours, minutes] = useMemo(() => {
    const [h, m] = value.split(":").map((v) => parseInt(v) || 0);
    return [h, m];
  }, [value]);

  const [tempH, setTempH] = useState(hours);
  const [tempM, setTempM] = useState(minutes);

  const handleOpen = useCallback(() => {
    setTempH(hours);
    setTempM(minutes);
    setOpen(true);
  }, [hours, minutes]);

  const handleConfirm = useCallback(() => {
    onChange(
      `${String(tempH).padStart(2, "0")}:${String(tempM).padStart(2, "0")}`,
    );
    setOpen(false);
  }, [tempH, tempM, onChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t("payslip.scheduledBlockHours")}</Text>
      <TouchableOpacity style={styles.inputContainer} onPress={handleOpen}>
        <Clock size={20} color={colors.textSecondary} />
        <Text style={styles.valueText}>{value}</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent
        visible={open}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t("payslip.selectHours")}</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.columns}>
              <PickerColumn
                items={HOUR_ITEMS}
                selected={tempH}
                onChange={setTempH}
                label="HH"
              />
              <View style={styles.colon}>
                <Text style={styles.colonText}>:</Text>
              </View>
              <PickerColumn
                items={MINUTE_ITEMS}
                selected={tempM}
                onChange={setTempM}
                label="MM"
              />
            </View>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>
                {t("payslip.confirm")}
              </Text>
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
    flexDirection: "row",
    alignItems: "center",
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
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  closeButton: { padding: spacing.xs },
  columns: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  colon: {
    width: 20,
    alignItems: "center",
    paddingBottom:
      ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) + ITEM_HEIGHT / 2,
  },
  colonText: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  confirmButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
});
