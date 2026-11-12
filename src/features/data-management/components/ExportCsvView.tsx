import { Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton, AppHeader, AppScreen, AppText } from '@/components/ui';
import { ReportPeriodSelector } from '@/features/reports/components/ReportPeriodSelector';
import { useExportCsv } from '@/features/reports/hooks/useExportCsv';
import { presetPeriod } from '@/features/reports/period';
import type { ReportPeriod } from '@/features/reports/types';

/** Settings shortcut to the Reports CSV export, with its own period (Reports is unaffected). */
export function ExportCsvView() {
  const { t } = useTranslation('dataManagement');
  const { t: tr } = useTranslation('reports');
  const [today] = useState(() => new Date());
  const [period, setPeriod] = useState<ReportPeriod>(() => presetPeriod('thisMonth', today));
  const { exportCsv, exporting } = useExportCsv(period);

  return (
    <AppScreen
      header={<AppHeader title={t('export.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      <AppText variant="body" color="textSecondary">
        {t('export.intro')}
      </AppText>
      <ReportPeriodSelector period={period} onChange={setPeriod} today={today} />
      <AppButton
        label={tr('export.button')}
        icon={Share2}
        onPress={() => void exportCsv()}
        loading={exporting}
        disabled={exporting}
        fullWidth
      />
    </AppScreen>
  );
}
