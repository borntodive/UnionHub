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
import { colors, spacing, typography, borderRadius } from "../../theme";

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5; // odd — center slot is the selection
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2);
// Repeat 20×: starting in the middle gives ~10 full rotations before hitting an edge
const REPEAT = 20;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// ---------------------------------------------------------------------------

interface PickerColumnProps {
  items: number[];
  selected: number;
  onChange: (v: number) => void;
}

const PickerColumn: React.FC<PickerColumnProps> = ({
  items,
  selected,
  onChange,
}) => {
  const scrollRef = useRef<ScrollView>(null);

  // Extend the list REPEAT times for the infinite-loop illusion
  const extended = useMemo(
    () =>
      Array.from(
        { length: items.length * REPEAT },
        (_, i) => items[i % items.length],
      ),
    [items],
  );

  // Start in the middle repetition so there's room to scroll both ways
  const initialIndex = Math.floor(REPEAT / 2) * items.length + selected;

  const [centeredIndex, setCenteredIndex] = useState(initialIndex);

  // Scroll to initial position on mount (runs once)
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
      const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
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
      {/* Fixed selection band — sits behind the scrolling numbers */}
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
  );
};

const colStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
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
    color: colors.textInverse,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.xl ?? 22,
  },
});

// ---------------------------------------------------------------------------

interface TimePickerSheetProps {
  label: string;
  hint?: string;
  value: string; // "HH:MM" — empty string shows placeholder
  onChange: (value: string) => void;
  placeholder?: string;
}

export const TimePickerSheet: React.FC<TimePickerSheetProps> = ({
  label,
  hint,
  value,
  onChange,
  placeholder = "--:--",
}) => {
  const [open, setOpen] = useState(false);

  const { h: currentH, m: currentM } = useMemo(() => {
    if (!value || value.length < 5) return { h: 0, m: 0 };
    const [h, m] = value.split(":").map(Number);
    return { h: isNaN(h) ? 0 : h, m: isNaN(m) ? 0 : m };
  }, [value]);

  const [tempH, setTempH] = useState(currentH);
  const [tempM, setTempM] = useState(currentM);

  const handleOpen = useCallback(() => {
    setTempH(currentH);
    setTempM(currentM);
    setOpen(true);
  }, [currentH, currentM]);

  const handleConfirm = useCallback(() => {
    onChange(
      `${String(tempH).padStart(2, "0")}:${String(tempM).padStart(2, "0")}`,
    );
    setOpen(false);
  }, [tempH, tempM, onChange]);

  const isEmpty = !value || value.length < 5;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <TouchableOpacity style={styles.field} onPress={handleOpen}>
        <Clock
          size={18}
          color={isEmpty ? colors.textTertiary : colors.primary}
        />
        <Text style={[styles.fieldText, isEmpty && styles.fieldPlaceholder]}>
          {isEmpty ? placeholder : value}
        </Text>
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
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.closeBtn}
              >
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Column labels */}
            <View style={styles.columnLabels}>
              <Text style={styles.columnLabel}>HH</Text>
              <Text style={styles.columnLabel}>MM</Text>
            </View>

            {/* Drum-roll columns */}
            <View style={styles.columns}>
              <PickerColumn
                items={HOURS}
                selected={tempH}
                onChange={setTempH}
              />
              <View style={styles.colon}>
                <Text style={styles.colonText}>:</Text>
              </View>
              <PickerColumn
                items={MINUTES}
                selected={tempM}
                onChange={setTempM}
              />
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmText}>Conferma</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: spacing.sm },
  label: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  hint: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xs,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  fieldText: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  fieldPlaceholder: {
    color: colors.textTertiary,
    fontWeight: typography.weights.regular,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
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
  closeBtn: { padding: spacing.xs },
  columnLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  columnLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textTertiary,
    letterSpacing: 1,
  },
  columns: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  colon: {
    width: 20,
    alignItems: "center",
    marginBottom: 2,
  },
  colonText: {
    fontSize: 28,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  confirmText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.textInverse,
  },
});
