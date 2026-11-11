import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { AppChip, AppIconButton, AppText } from '@/components/ui';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles } from '@/theme';
import { fromIsoDate } from '@/utils/dates';

import { activePreset, isAtOrAfterToday, presetPeriod, resolveRange, shiftPeriod } from '../period';
import type { ReportPeriod, ReportPreset } from '../types';
import { CustomRangeSheet } from './CustomRangeSheet';

const PRESETS: readonly ReportPreset[] = ['thisMonth', 'lastMonth', 'thisYear', 'custom'];

/** Human label for a period ("May 2025", "2025", "1 May 2025 – 10 Jun 2025"). */
export function usePeriodLabel() {
  const { t } = useTranslation('reports');
  const format = useFormatters();
  return (period: ReportPeriod): string => {
    switch (period.kind) {
      case 'month':
        return format.monthYear(fromIsoDate(period.month));
      case 'year':
        return String(period.year);
      case 'custom':
        return t('period.range', {
          from: format.longDate(period.from),
          to: format.longDate(period.to),
        });
    }
  };
}

export interface ReportPeriodSelectorProps {
  period: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
  today: Date;
}

/** Prev/next stepper with the period label, plus preset chips and a custom range sheet. */
export function ReportPeriodSelector({ period, onChange, today }: ReportPeriodSelectorProps) {
  const styles = useStyles();
  const { t } = useTranslation('reports');
  const labelOf = usePeriodLabel();
  const [customOpen, setCustomOpen] = useState(false);
  const label = labelOf(period);
  const preset = activePreset(period, today);
  const steppable = period.kind !== 'custom';

  const choose = (next: ReportPreset) => {
    if (next === 'custom') setCustomOpen(true);
    else onChange(presetPeriod(next, today));
  };

  return (
    <View style={styles.root}>
      <View style={styles.stepper}>
        <AppIconButton
          icon={ChevronLeft}
          accessibilityLabel={t('period.previous')}
          onPress={() => onChange(shiftPeriod(period, -1))}
          disabled={!steppable}
          mirrorInRTL
        />
        <AppText
          variant="heading3"
          align="center"
          style={styles.label}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityLiveRegion="polite"
          accessibilityLabel={t('period.selected', { period: label })}>
          {label}
        </AppText>
        <AppIconButton
          icon={ChevronRight}
          accessibilityLabel={t('period.next')}
          onPress={() => onChange(shiftPeriod(period, 1))}
          disabled={!steppable || isAtOrAfterToday(period, today)}
          mirrorInRTL
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        accessibilityLabel={t('period.label')}>
        {PRESETS.map((p) => (
          <AppChip
            key={p}
            role={p === 'custom' ? 'button' : 'radio'}
            label={t(`period.presets.${p}`)}
            selected={preset === p}
            onPress={() => choose(p)}
          />
        ))}
      </ScrollView>
      <CustomRangeSheet
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        initial={resolveRange(period)}
        onApply={({ from, to }) => onChange({ kind: 'custom', from, to })}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  label: { flex: 1 },
  chips: { gap: t.spacing.sm },
}));
