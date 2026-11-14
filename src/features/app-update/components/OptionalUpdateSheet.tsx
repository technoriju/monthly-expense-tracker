import { useTranslation } from 'react-i18next';

import { AppButton, AppSheet, AppText } from '@/components/ui';
import { getAppInfo } from '@/features/settings/appInfo';
import { useSettingsStore } from '@/store/settingsStore';

import { pickLocalized } from '../schema';
import type { UpdateGate } from '../hooks/useUpdateGate';
import { ReleaseNotesList } from './ReleaseNotesList';

/** Newer version available: the user may update or carry on ("Later" or close). */
export function OptionalUpdateSheet({ gate, visible }: { gate: UpdateGate; visible: boolean }) {
  const { t } = useTranslation('appUpdate');
  const language = useSettingsStore((s) => s.uiLanguage);
  const latest = gate.config?.latestVersion ?? '';
  const message = pickLocalized(gate.config?.message, language);

  return (
    <AppSheet
      visible={visible}
      onClose={gate.dismiss}
      title={t('optional.title')}
      footer={
        <>
          {gate.storeUnavailable ? (
            <AppText variant="bodySmall" color="expenseText" accessibilityRole="alert">
              {t('errors.storeUnavailable')}
            </AppText>
          ) : null}
          <AppButton
            label={t('actions.updateNow')}
            onPress={gate.openStore}
            fullWidth
            testID="optional-update-now"
          />
          <AppButton
            label={t('actions.later')}
            onPress={gate.dismiss}
            variant="ghost"
            fullWidth
            testID="optional-update-later"
          />
        </>
      }>
      <AppText variant="body" color="textSecondary" testID="optional-update-sheet">
        {message ?? t('optional.message', { version: latest })}
      </AppText>
      <AppText variant="bodySmall" color="textSecondary">
        {t('versions', { installed: getAppInfo().version, latest })}
      </AppText>
      <ReleaseNotesList config={gate.config} />
    </AppSheet>
  );
}
