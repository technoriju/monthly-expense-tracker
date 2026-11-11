import { Pressable, View } from 'react-native';

import type { Script } from '@/i18n/languages';
import { makeStyles } from '@/theme';

import { AppText } from './AppText';

export interface SegmentOption<T extends string> {
  value: T;
  /** Already-translated label. */
  label: string;
  /** Font script for a label written in another language (e.g. "বাংলা" in an English UI). */
  script?: Script;
}

export interface AppSegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Already-translated name of the whole control. */
  accessibilityLabel: string;
}

/** Two-or-more pill switch (design-reference: Expense / Income, বাংলা / English). */
export function AppSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: AppSegmentedControlProps<T>) {
  const styles = useStyles();
  return (
    <View
      style={styles.root}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={({ pressed }) => [
              styles.segment,
              selected ? styles.selected : styles.unselected,
              pressed && styles.pressed,
            ]}>
            <AppText
              variant="button"
              color={selected ? 'onPrimary' : 'primary'}
              numberOfLines={1}
              align="center"
              script={option.script}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flexDirection: 'row', gap: t.spacing.md },
  segment: {
    flex: 1,
    minHeight: t.layout.buttonHeight.sm,
    borderRadius: t.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.spacing.md,
  },
  selected: { backgroundColor: t.colors.primary },
  unselected: { backgroundColor: t.colors.primarySoft },
  pressed: { opacity: t.layout.pressedOpacity },
}));
