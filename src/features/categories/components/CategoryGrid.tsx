import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

import { useCategoryName } from '../hooks/useCategoryName';
import type { Category } from '../types';
import { CategoryIcon } from './CategoryIcon';

export interface CategoryGridProps {
  categories: readonly Category[];
  selectedId: number | null;
  onSelect: (category: Category) => void;
  /** Already-translated name of the group (screen-reader label). */
  accessibilityLabel: string;
}

/** 4-column icon grid (design-reference Add Transaction). */
export function CategoryGrid({
  categories,
  selectedId,
  onSelect,
  accessibilityLabel,
}: CategoryGridProps) {
  const styles = useStyles();
  const nameOf = useCategoryName();

  return (
    <View
      style={styles.grid}
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}>
      {categories.map((category) => {
        const selected = category.id === selectedId;
        const name = nameOf(category);
        return (
          <Pressable
            key={category.id}
            onPress={() => onSelect(category)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={name}
            style={({ pressed }) => [
              styles.cell,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}>
            <CategoryIcon category={category} />
            <AppText
              variant="bodySmall"
              color={selected ? 'primary' : 'textPrimary'}
              align="center"
              numberOfLines={2}>
              {name}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
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
