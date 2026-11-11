import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

export interface LegendItem {
  key: string;
  /** Resolved theme color of the matching chart slice. */
  color: string;
  label: string;
  /** Already-formatted values shown at the end of the row (e.g. "38%", "₹16,200"). */
  values: readonly string[];
}

/** Dot + label + right-aligned values, one row per chart slice (design-reference Reports). */
export function Legend({ items }: { items: readonly LegendItem[] }) {
  const styles = useStyles();
  return (
    <View style={styles.root}>
      {items.map((item) => (
        <View
          key={item.key}
          style={styles.row}
          accessible
          accessibilityLabel={[item.label, ...item.values].join(', ')}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <AppText variant="bodySmall" style={styles.label} numberOfLines={1}>
            {item.label}
          </AppText>
          {item.values.map((value, i) => (
            <AppText key={i} variant="bodySmall" color="textSecondary" numberOfLines={1}>
              {value}
            </AppText>
          ))}
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  dot: {
    width: t.layout.legendDotSize,
    height: t.layout.legendDotSize,
    borderRadius: t.radius.pill,
  },
  label: { flex: 1 },
}));
