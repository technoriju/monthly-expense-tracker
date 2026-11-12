import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUiStore } from '@/store/uiStore';

import { exportService, type ExportFormat } from '../services/exportService';
import type { ReportPeriod } from '../types';

/**
 * Exports transactions as CSV (or PDF) and reports the outcome with a toast. Uses `periodOverride`
 * when given (Settings export), otherwise the shared report period.
 */
export function useExportCsv(periodOverride?: ReportPeriod) {
  const { t } = useTranslation('reports');
  const reportPeriod = useUiStore((s) => s.reportPeriod);
  const period = periodOverride ?? reportPeriod;
  const showToast = useUiStore((s) => s.showToast);
  const [exporting, setExporting] = useState(false);

  const exportFile = async (format: ExportFormat) => {
    if (exporting) return;
    setExporting(true);
    try {
      const result =
        format === 'pdf'
          ? await exportService.exportTransactionsPdf(period)
          : await exportService.exportTransactionsCsv(period);
      if (result === 'empty') showToast(t('export.empty'), 'error');
      else if (result === 'unavailable') showToast(t('export.unavailable'), 'error');
    } catch (error) {
      console.error(`${format.toUpperCase()} export failed`, error);
      showToast(t('export.failed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const exportCsv = () => exportFile('csv');

  return { exportCsv, exportFile, exporting };
}
