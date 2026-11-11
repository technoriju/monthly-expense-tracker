import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppChip, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';
import { PAYMENT_METHODS, type PaymentMethod } from '@/types/money';

export interface PaymentMethodFieldProps {
  value: PaymentMethod | null;
  onChange: (value: PaymentMethod | null) => void;
}

/** Optional single choice; tapping the selected chip again clears it. */
export function PaymentMethodField({ value, onChange }: PaymentMethodFieldProps) {
  const styles = useStyles();
  const { t } = useTranslation('transactions');
  const label = t('fields.paymentMethod');
  return (
    <View style={styles.root}>
      <AppText variant="bodyMedium">{label}</AppText>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {PAYMENT_METHODS.map((method) => (
          <AppChip
            key={method}
            label={t(`paymentMethods.${method}`)}
            selected={value === method}
            onPress={() => onChange(value === method ? null : method)}
          />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
