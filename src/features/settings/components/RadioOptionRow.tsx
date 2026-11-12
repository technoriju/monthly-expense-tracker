import { Check } from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppIcon, AppText } from '@/components/ui';
import type { Script } from '@/i18n/languages';
import { makeStyles, useTheme } from '@/theme';

export interface RadioOptionRowProps {
  label: string;
  /** Render `label` in a specific script font (e.g. a language's native name). */
  labelScript?: Script;
  description?: string;
  descriptionScript?: Script;
  selected: boolean;
  loading?: boolean;
  showDivider: boolean;
  onPress: () => void;
}

/** One choice of a single-select list: label (+ description) and a check when selected. */
export function RadioOptionRow({
  label,
  labelScript,
  description,
  descriptionScript,
  selected,
  loading = false,
  showDivider,
  onPress,
}: RadioOptionRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <>
      {showDivider ? <View style={styles.divider} /> : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected, busy: loading }}
        accessibilityLabel={description ? `${label}, ${description}` : label}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.names}>
          <AppText variant="bodyMedium" script={labelScript}>
            {label}
          </AppText>
          {description ? (
            <AppText variant="bodySmall" color="textSecondary" script={descriptionScript}>
              {description}
            </AppText>
          ) : null}
        </View>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : selected ? (
          <AppIcon icon={Check} size="md" color="primary" strokeWidth={2.5} />
        ) : null}
      </Pressable>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.layout.minTouchTarget,
    paddingVertical: t.spacing.md,
  },
  pressed: { opacity: t.layout.pressedOpacity },
  names: { flex: 1 },
  divider: { height: t.layout.hairline, backgroundColor: t.colors.border },
}));
