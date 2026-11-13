import { Image } from 'expo-image';
import {
  Camera,
  CameraOff,
  FileWarning,
  ImageIcon,
  PenLine,
  RotateCcw,
  RotateCw,
  ScanText,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppIcon,
  AppIconButton,
  AppScreen,
  AppText,
} from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

import { useReceiptScan, type ScanErrorCode } from '../hooks/useReceiptScan';

/**
 * Scan a receipt: camera or gallery → check the photo (rotate / retake) → read on-device →
 * Review. Manual entry is always offered.
 */
export function ReceiptScanView() {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const scan = useReceiptScan();
  const { state } = scan;

  return (
    <AppScreen
      header={<AppHeader title={t('scan.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      {state.kind === 'choose' ? (
        <>
          {scan.storedDraft ? (
            <AppCard variant="muted" style={styles.resume}>
              <AppText variant="bodyMedium">{t('scan.resume.title')}</AppText>
              <AppText variant="bodySmall" color="textSecondary">
                {t('scan.resume.message')}
              </AppText>
              <View style={styles.row}>
                <AppButton label={t('scan.resume.continue')} size="sm" onPress={scan.resume} />
                <AppButton
                  label={t('scan.resume.discard')}
                  size="sm"
                  variant="ghost"
                  onPress={scan.discardStored}
                />
              </View>
            </AppCard>
          ) : null}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <AppIcon icon={ScanText} size="xxl" color="primary" />
            </View>
            <AppText variant="body" align="center">
              {t('scan.intro')}
            </AppText>
          </View>
          <View style={styles.actions}>
            <AppButton
              label={t('scan.takePhoto')}
              icon={Camera}
              onPress={scan.takePhoto}
              fullWidth
            />
            <AppButton
              label={t('scan.choosePhoto')}
              icon={ImageIcon}
              variant="secondary"
              onPress={scan.choosePhoto}
              fullWidth
            />
            <AppButton
              label={t('scan.enterManually')}
              icon={PenLine}
              variant="ghost"
              onPress={scan.enterManually}
              fullWidth
            />
          </View>
          <AppText variant="bodySmall" color="textSecondary" align="center">
            {t('scan.languageNote')}
          </AppText>
        </>
      ) : null}

      {state.kind === 'preview' ? (
        <>
          <View style={styles.preview}>
            <Image
              source={{ uri: state.uri }}
              style={styles.fill}
              contentFit="contain"
              accessibilityLabel={t('scan.preview.imageLabel')}
            />
          </View>
          <View style={styles.rotate}>
            <AppIconButton
              icon={RotateCcw}
              variant="soft"
              onPress={() => void scan.rotate(-90)}
              accessibilityLabel={t('scan.preview.rotateLeft')}
            />
            <AppIconButton
              icon={RotateCw}
              variant="soft"
              onPress={() => void scan.rotate(90)}
              accessibilityLabel={t('scan.preview.rotateRight')}
            />
          </View>
          <View style={styles.actions}>
            <AppButton
              label={t('scan.preview.usePhoto')}
              onPress={() => void scan.confirmPhoto()}
              fullWidth
            />
            <AppButton
              label={t('scan.preview.retake')}
              variant="secondary"
              onPress={scan.retake}
              fullWidth
            />
          </View>
        </>
      ) : null}

      {state.kind === 'processing' ? (
        <Processing stage={state.stage} onCancel={scan.cancelProcessing} />
      ) : null}

      {state.kind === 'error' ? (
        <ScanError
          code={state.code}
          canOpenSettings={state.code === 'cameraDenied' && state.canAskAgain === false}
          onOpenSettings={scan.openSettings}
          onTryAgain={scan.tryAgain}
          onManual={scan.enterManually}
        />
      ) : null}
    </AppScreen>
  );
}

function Processing({ stage, onCancel }: { stage: string; onCancel: () => void }) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const { colors } = useTheme();
  const label =
    stage === 'reading'
      ? t('scan.processing.reading')
      : stage === 'analysing'
        ? t('scan.processing.analysing')
        : t('scan.processing.preparing');
  return (
    <View style={styles.processing} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="bodyMedium" align="center">
        {label}
      </AppText>
      {stage === 'reading' ? (
        <AppButton label={t('scan.processing.cancel')} variant="ghost" onPress={onCancel} />
      ) : null}
    </View>
  );
}

function ScanError({
  code,
  canOpenSettings,
  onOpenSettings,
  onTryAgain,
  onManual,
}: {
  code: ScanErrorCode;
  canOpenSettings: boolean;
  onOpenSettings: () => void;
  onTryAgain: () => void;
  onManual: () => void;
}) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  return (
    <View style={styles.error}>
      <AppEmptyState
        icon={code === 'cameraDenied' ? CameraOff : FileWarning}
        tone="error"
        title={t(`scan.errors.${code}.title`)}
        message={t(`scan.errors.${code}.message`)}
      />
      <View style={styles.actions}>
        {canOpenSettings ? (
          <AppButton label={t('scan.errors.openSettings')} onPress={onOpenSettings} fullWidth />
        ) : null}
        {code !== 'unavailable' ? (
          <AppButton
            label={t('scan.errors.tryAgain')}
            variant={canOpenSettings ? 'secondary' : 'primary'}
            onPress={onTryAgain}
            fullWidth
          />
        ) : null}
        <AppButton
          label={t('scan.errors.enterDetails')}
          variant={code === 'unavailable' ? 'primary' : 'ghost'}
          icon={PenLine}
          onPress={onManual}
          fullWidth
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  resume: { gap: t.spacing.xs },
  row: { flexDirection: 'row', gap: t.spacing.sm, paddingTop: t.spacing.xs },
  hero: { alignItems: 'center', gap: t.spacing.lg, paddingVertical: t.spacing.xl },
  heroIcon: {
    width: t.layout.avatarLargeSize,
    height: t.layout.avatarLargeSize,
    borderRadius: t.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.primarySoft,
  },
  actions: { gap: t.spacing.sm },
  preview: {
    height: t.layout.receiptPreviewHeight,
    borderRadius: t.radius.lg,
    overflow: 'hidden',
    backgroundColor: t.colors.surfaceMuted,
  },
  fill: { width: '100%', height: '100%' },
  rotate: { flexDirection: 'row', justifyContent: 'center', gap: t.spacing.lg },
  processing: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.lg,
    paddingVertical: t.spacing.xxxl,
  },
  error: { gap: t.spacing.lg },
}));
