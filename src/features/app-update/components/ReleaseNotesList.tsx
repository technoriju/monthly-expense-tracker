import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { useSettingsStore } from '@/store/settingsStore';
import { makeStyles } from '@/theme';

import { pickLocalized, type UpdateConfig } from '../schema';

/** "What's new" bullets in the UI language (then English, then the plain list). */
export function ReleaseNotesList({ config }: { config: UpdateConfig | null }) {
  const styles = useStyles();
  const { t } = useTranslation('appUpdate');
  const language = useSettingsStore((s) => s.uiLanguage);
  const notes = pickLocalized(config?.releaseNotes, language) ?? [];
  if (notes.length === 0) return null;

  return (
    <View style={styles.list} testID="release-notes">
      <AppText variant="bodyMedium" accessibilityRole="header">
        {t('releaseNotes')}
      </AppText>
      {notes.map((note, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.bullet} accessible={false} importantForAccessibility="no" />
          <AppText variant="body" color="textSecondary" style={styles.text}>
            {note}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.spacing.sm, alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm },
  bullet: {
    width: t.spacing.sm,
    height: t.spacing.sm,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primary,
    marginTop: t.spacing.sm,
  },
  text: { flex: 1 },
}));
