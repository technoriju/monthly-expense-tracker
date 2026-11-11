import { CalendarDays, ChevronDown } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppIcon, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

/**
 * Month pill + calendar badge (design-reference Dashboard). Displays the current month.
 * Month switching arrives with real transaction data.
 */
export function MonthSelector({ month }: { month: Date }) {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  const format = useFormatters();
  const label = format.monthYear(month);

  return (
    <View
      style={styles.root}
      accessible
      accessibilityLabel={t('month.selectorLabel', { month: label })}>
      <View style={styles.pill}>
        <AppText variant="bodyMedium" numberOfLines={1}>
          {label}
        </AppText>
        <AppIcon icon={ChevronDown} size="sm" color="textSecondary" />
      </View>
      <View style={styles.calendar}>
        <AppIcon icon={CalendarDays} size="md" color="textSecondary" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: t.spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.border,
  },
  calendar: {
    padding: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.border,
  },
}));
