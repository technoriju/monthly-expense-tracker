import { Share2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton, AppHeader, AppScreen, AppSegmentedControl, AppText } from '@/components/ui';
import { ReportPeriodSelector } from '@/features/reports/components/ReportPeriodSelector';
import { useExportCsv } from '@/features/reports/hooks/useExportCsv';
import { presetPeriod } from '@/features/reports/period';
import type { ExportFormat } from '@/features/reports/services/exportService';
import type { ReportPeriod } from '@/features/reports/types';

/** Settings export of the period's transactions as CSV or PDF (Reports is unaffected). */
export function ExportCsvView() {
  const { t } = useTranslation('dataManagement');
  const { t: tr } = useTranslation('reports');
  const [today] = useState(() => new Date());
  const [period, setPeriod] = useState<ReportPeriod>(() => presetPeriod('thisMonth', today));
  const [format, setFormat] = useState<ExportFormat>('csv');
  const { exportFile, exporting } = useExportCsv(period);

  return (
    <AppScreen
      header={<AppHeader title={t('export.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      <AppText variant="body" color="textSecondary">
        {t('export.intro')}
      </AppText>
      <ReportPeriodSelector period={period} onChange={setPeriod} today={today} />
      <AppText variant="bodyMedium" accessibilityRole="header">
        {t('export.format')}
      </AppText>
      <AppSegmentedControl
        options={[
          { value: 'csv', label: t('export.csv') },
          { value: 'pdf', label: t('export.pdf') },
        ]}
        value={format}
        onChange={setFormat}
        accessibilityLabel={t('export.format')}
      />
      <AppText variant="bodySmall" color="textSecondary">
        {t(format === 'pdf' ? 'export.pdfHint' : 'export.csvHint')}
      </AppText>
      <AppButton
        label={format === 'pdf' ? tr('export.pdfButton') : tr('export.button')}
        icon={Share2}
        onPress={() => void exportFile(format)}
        loading={exporting}
        disabled={exporting}
        fullWidth
      />
    </AppScreen>
  );
}
