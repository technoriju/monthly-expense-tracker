import { router } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppHeader,
  AppIcon,
  AppScreen,
  AppSegmentedControl,
  AppText,
} from '@/components/ui';
import { useAnnounce } from '@/hooks/useAnnounce';
import { getLanguage, VOICE_LANGUAGES, type VoiceLanguage } from '@/i18n/languages';
import { useSettingsStore } from '@/store/settingsStore';
import { useVoiceDraftStore } from '@/store/voiceDraftStore';
import { makeStyles } from '@/theme';

import type { SpeechErrorCode, VoiceSessionState } from '../engine';
import { useVoiceLanguage } from '../hooks/useVoiceLanguage';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { parseVoiceExpense } from '../parser/voiceExpenseParser';
import { MicButton } from './MicButton';
import { LiveWaveform } from './Waveform';

type ErrorKey = Exclude<SpeechErrorCode, 'aborted'> | 'permissionBlocked';

function errorKey(state: VoiceSessionState): ErrorKey {
  const code = state.error?.code ?? 'unknown';
  if (code === 'permissionDenied' && state.permission === 'blocked') return 'permissionBlocked';
  return code === 'aborted' ? 'unknown' : code;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Voice Entry screen (design-reference row 1, col 5). Never writes to the database. */
export function VoiceEntryView() {
  const styles = useStyles();
  const { t } = useTranslation('voice');
  const currency = useSettingsStore((s) => s.currency);
  const setDraft = useVoiceDraftStore((s) => s.setDraft);
  const { voiceLanguage, setVoiceLanguage } = useVoiceLanguage();
  const { state, elapsedSeconds, start, stop, cancel, retry } = useVoiceRecorder(voiceLanguage);
  const voiceScript = getLanguage(voiceLanguage).script;

  const { status } = state;
  const listening = status === 'listening';
  const busy = status === 'preparing' || status === 'processing';
  const active = listening || busy;

  const openManual = () => {
    cancel();
    router.push('/transaction/new');
  };

  const review = () => {
    setDraft(
      parseVoiceExpense(state.transcript, {
        language: voiceLanguage,
        currency,
        today: new Date(),
      }),
    );
    router.push('/voice/review');
  };

  const changeLanguage = (code: VoiceLanguage) => {
    if (active) return; // the language of a running session cannot change
    cancel();
    setVoiceLanguage(code);
  };

  const onMicPress = () => {
    if (listening) stop();
    else if (status === 'idle') start();
    else retry();
  };

  const statusText =
    status === 'error' ? t(`errors.${errorKey(state)}.title`) : t(`status.${status}`);
  // iOS has no live regions. Nothing is announced while the microphone is open, so the
  // screen reader's speech is never recorded — only the outcome.
  useAnnounce(
    status === 'error'
      ? `${statusText}. ${t(`errors.${errorKey(state)}.message`)}`
      : status === 'done'
        ? state.transcript
        : null,
  );

  return (
    <AppScreen header={<AppHeader title={t('title')} />}>
      <View style={styles.hero}>
        <MicButton
          listening={listening}
          disabled={busy}
          onPress={onMicPress}
          accessibilityLabel={listening ? t('mic.stop') : busy ? t('mic.busy') : t('mic.start')}
        />
        <View style={styles.texts}>
          <AppText
            variant="heading2"
            align="center"
            accessibilityRole="header"
            accessibilityLiveRegion="polite">
            {statusText}
          </AppText>
          {status === 'error' ? null : (
            <>
              <AppText variant="body" color="textSecondary" align="center">
                {t(`instructions.${voiceLanguage}`)}
              </AppText>
              <AppText
                variant="bodySmall"
                color="textSecondary"
                align="center"
                script={voiceScript}>
                {t(`examples.${voiceLanguage}`)}
              </AppText>
            </>
          )}
          {listening ? (
            <AppText
              variant="bodyMedium"
              color="primaryText"
              align="center"
              constrainScale
              accessibilityLabel={t('durationLabel', { time: formatDuration(elapsedSeconds) })}>
              {formatDuration(elapsedSeconds)}
            </AppText>
          ) : null}
        </View>
      </View>

      <AppSegmentedControl
        accessibilityLabel={t('languageLabel')}
        value={voiceLanguage}
        onChange={changeLanguage}
        options={VOICE_LANGUAGES.map((code) => {
          const language = getLanguage(code);
          return { value: code, label: language.nativeName, script: language.script };
        })}
      />

      <LiveWaveform active={listening} />

      {state.localeSupport === 'onDevice' || state.localeSupport === 'network' ? (
        <AppText variant="bodySmall" color="textSecondary" align="center">
          {t(`notice.${state.localeSupport}`)}
        </AppText>
      ) : null}

      {status === 'error' ? (
        <AppCard variant="expense" style={styles.errorCard}>
          <View style={styles.errorRow}>
            <AppIcon icon={TriangleAlert} size="md" color="expense" />
            <AppText variant="body" style={styles.flex} accessibilityLiveRegion="polite">
              {t(`errors.${errorKey(state)}.message`)}
            </AppText>
          </View>
        </AppCard>
      ) : (
        <AppCard style={styles.transcript}>
          <AppText variant="caption" color="textSecondary">
            {t('transcript.label')}
          </AppText>
          {state.transcript ? (
            <AppText
              variant="bodyMedium"
              script={voiceScript}
              // Announce the final text once, not every partial result while speaking.
              accessibilityLiveRegion={status === 'done' ? 'polite' : 'none'}>
              {state.transcript}
            </AppText>
          ) : (
            <AppText variant="body" color="textSecondary">
              {t('transcript.empty')}
            </AppText>
          )}
        </AppCard>
      )}

      <View style={styles.actions}>
        {status === 'done' ? (
          <>
            <AppButton label={t('actions.review')} onPress={review} fullWidth />
            <AppButton label={t('actions.retry')} variant="secondary" onPress={retry} fullWidth />
          </>
        ) : null}
        {listening ? <AppButton label={t('actions.stop')} onPress={stop} fullWidth /> : null}
        {active ? (
          <AppButton label={t('actions.cancel')} variant="secondary" onPress={cancel} fullWidth />
        ) : null}
        {status === 'error' ? (
          <>
            <AppButton label={t('actions.retry')} onPress={retry} fullWidth />
            {state.permission === 'blocked' ? (
              <AppButton
                label={t('actions.openSettings')}
                variant="secondary"
                onPress={() => void Linking.openSettings()}
                fullWidth
              />
            ) : null}
          </>
        ) : null}
        {active ? null : (
          <AppButton label={t('actions.manual')} variant="ghost" onPress={openManual} fullWidth />
        )}
      </View>
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { alignItems: 'center', gap: t.spacing.xl, paddingTop: t.spacing.md },
  texts: { alignItems: 'center', gap: t.spacing.xs },
  transcript: { gap: t.spacing.xs },
  errorCard: { gap: t.spacing.sm },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  flex: { flex: 1 },
  actions: { gap: t.spacing.sm },
}));
