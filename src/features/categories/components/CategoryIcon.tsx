import { View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

import { CATEGORY_TONES, getCategoryVisual } from '../categoryVisuals';
import type { CategoryKey } from '../types';

/** Pastel circle with a Lucide icon (design.md §6 Category Icons). */
export function CategoryIcon({ categoryKey }: { categoryKey: CategoryKey }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { icon, tone } = getCategoryVisual(categoryKey);
  const { background, foreground } = CATEGORY_TONES[tone];
  return (
    <View style={[styles.circle, { backgroundColor: colors[background] }]}>
      <AppIcon icon={icon} size="md" color={foreground} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  circle: {
    width: t.layout.categoryIconSize,
    height: t.layout.categoryIconSize,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
