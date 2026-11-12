import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppCard, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';

import type { ReportSummary } from '../types';

/**
 * Net balance (income − expenses) and what was saved from this period's income.
 * Wording avoids implying an account balance: opening balances are not tracked.
 */
export function NetSummaryCard({ summary }: { summary: ReportSummary }) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const format = useFormatters();
  const net = format.money(summary.netBalanceMinor, 'exceptZero');
  const saved = format.money(summary.savedMinor);
  const rate =
    summary.savingsRateBp === null
      ? t('summary.noIncome')
      : format.percentBp(summary.savingsRateBp);

  return (
    <AppCard>
      <View
        style={styles.netRow}
        accessible
        accessibilityLabel={`${t('summary.netBalance')}, ${net}. ${t('summary.netCaption')}`}>
        <View style={styles.flex}>
          <AppText variant="bodyMedium">{t('summary.netBalance')}</AppText>
          <AppText variant="caption" color="textSecondary">
            {t('summary.netCaption')}
          </AppText>
        </View>
        <AppText
          variant="amountMedium"
          color={summary.netBalanceMinor < 0 ? 'expenseText' : 'textPrimary'}
          numberOfLines={1}
          constrainScale>
          {net}
        </AppText>
      </View>
      <View style={styles.divider} />
      <View style={styles.statsRow}>
        <View style={styles.stat} accessible accessibilityLabel={`${t('summary.saved')}, ${saved}`}>
          <AppText variant="caption" color="textSecondary">
            {t('summary.saved')}
          </AppText>
          <AppText variant="bodyMedium" color="incomeText" numberOfLines={1} constrainScale>
            {saved}
          </AppText>
        </View>
        <View
          style={styles.stat}
          accessible
          accessibilityLabel={`${t('summary.savingsRate')}, ${rate}`}>
          <AppText variant="caption" color="textSecondary">
            {t('summary.savingsRate')}
          </AppText>
          <AppText variant="bodyMedium" numberOfLines={1} constrainScale>
            {rate}
          </AppText>
        </View>
      </View>
      <AppText variant="caption" color="textSecondary" style={styles.caption}>
        {t('summary.savedCaption')}
      </AppText>
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  netRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  divider: {
    height: t.layout.hairline,
    backgroundColor: t.colors.border,
    marginVertical: t.spacing.md,
  },
  statsRow: { flexDirection: 'row', gap: t.spacing.md },
  stat: { flex: 1, gap: t.spacing.xs },
  caption: { marginTop: t.spacing.md },
}));
