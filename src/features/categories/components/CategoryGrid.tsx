import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

import { AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

export interface CategoryCellProps {
  icon: ReactNode;
  /** Already-translated label. */
  label: string;
  /** Omit for action tiles (rendered as buttons instead of radios). */
  selected?: boolean;
  onPress: () => void;
  accessibilityHint?: string;
}

/** One quarter-width tile of the category grid: icon circle above a label. */
export function CategoryCell({
  icon,
  label,
  selected,
  onPress,
  accessibilityHint,
}: CategoryCellProps) {
  const styles = useCellStyles();
  const isRadio = selected !== undefined;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={isRadio ? 'radio' : 'button'}
      accessibilityState={isRadio ? { checked: selected } : undefined}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.cell,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}>
      {icon}
      <AppText
        variant="bodySmall"
        color={selected ? 'primaryText' : 'textPrimary'}
        align="center"
        numberOfLines={2}>
        {label}
      </AppText>
    </Pressable>
  );
}

export const useCellStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: t.spacing.sm },
  cell: {
    width: '25%',
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.md,
    borderWidth: t.layout.borderWidth,
    borderColor: 'transparent',
  },
  selected: { backgroundColor: t.colors.primarySoft, borderColor: t.colors.primary },
  pressed: { opacity: t.layout.pressedOpacity },
}));
