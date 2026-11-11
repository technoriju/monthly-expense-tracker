import { TrendingUp, Wallet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppCard, AppIcon, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';
import type { MinorAmount } from '@/types/money';

/** Purple "Remaining Balance" card (design-reference Dashboard). */
export function BalanceCard({ amountMinor }: { amountMinor: MinorAmount }) {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  const format = useFormatters();
  const amount = format.money(amountMinor);
  const label = t('summary.remainingBalance');

  return (
    <AppCard variant="primary" padding="xl" accessible accessibilityLabel={`${label}, ${amount}`}>
      <View style={styles.row}>
        <AppIcon icon={Wallet} size="lg" color="onPrimaryMuted" />
        <View style={styles.center}>
          <AppText
            variant="amountLarge"
            color="onPrimary"
            numberOfLines={1}
            adjustsFontSizeToFit
            constrainScale>
            {amount}
          </AppText>
          <AppText variant="bodySmall" color="onPrimaryMuted" numberOfLines={1}>
            {label}
          </AppText>
        </View>
        <AppIcon icon={TrendingUp} size="lg" color="onPrimaryMuted" mirrorInRTL />
      </View>
    </AppCard>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  center: { flex: 1, alignItems: 'center' },
}));
