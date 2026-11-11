import { ChartSpline } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppCard, AppIcon, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

/** Reserved slot for the monthly expense trend chart (built on react-native-svg later). */
export function ChartPlaceholder() {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  return (
    <AppCard>
      <AppText variant="bodyMedium" accessibilityRole="header">
        {t('chart.title')}
      </AppText>
      <View style={styles.area}>
        <AppIcon icon={ChartSpline} size="xxl" color="textMuted" />
        <AppText variant="bodySmall" color="textMuted" align="center">
          {t('chart.placeholder')}
        </AppText>
      </View>
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  area: {
    minHeight: t.layout.chartPlaceholderHeight,
    marginTop: t.spacing.md,
    borderRadius: t.radius.lg,
    borderWidth: t.layout.borderWidth,
    borderStyle: 'dashed',
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.lg,
  },
}));
