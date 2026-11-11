import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUiStore } from '@/store/uiStore';

import { exportService } from '../services/exportService';

/** Exports the shared report period as CSV and reports the outcome with a toast. */
export function useExportCsv() {
  const { t } = useTranslation('reports');
  const period = useUiStore((s) => s.reportPeriod);
  const showToast = useUiStore((s) => s.showToast);
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const result = await exportService.exportTransactionsCsv(period);
      if (result === 'empty') showToast(t('export.empty'), 'error');
      else if (result === 'unavailable') showToast(t('export.unavailable'), 'error');
    } catch (error) {
      console.error('CSV export failed', error);
      showToast(t('export.failed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  return { exportCsv, exporting };
}
