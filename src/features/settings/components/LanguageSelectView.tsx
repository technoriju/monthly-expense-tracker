import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppCard, AppHeader, AppIcon, AppScreen, AppText } from '@/components/ui';
import type { LanguageDefinition } from '@/i18n/languages';
import { makeStyles, useTheme } from '@/theme';

import { useLanguageSettings } from '../hooks/useLanguageSettings';

export function LanguageSelectView() {
  const styles = useStyles();
  const { t } = useTranslation('settings');
  const { current, options, pending, selectLanguage } = useLanguageSettings();

  return (
    <AppScreen
      header={<AppHeader title={t('language.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      <AppCard padding="lg" style={styles.card}>
        <View accessibilityRole="radiogroup">
          {options.map((lang, i) => (
            <LanguageOption
              key={lang.code}
              language={lang}
              selected={lang.code === current.code}
              loading={lang.code === pending}
              showDivider={i > 0}
              onPress={() => void selectLanguage(lang.code)}
            />
          ))}
        </View>
      </AppCard>
      <AppText variant="bodySmall" color="textSecondary" align="center">
        {t('language.hint')}
      </AppText>
    </AppScreen>
  );
}

interface LanguageOptionProps {
  language: LanguageDefinition;
  selected: boolean;
  loading: boolean;
  showDivider: boolean;
  onPress: () => void;
}

function LanguageOption({
  language,
  selected,
  loading,
  showDivider,
  onPress,
}: LanguageOptionProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <>
      {showDivider ? <View style={styles.divider} /> : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected, busy: loading }}
        accessibilityLabel={`${language.nativeName}, ${language.englishName}`}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.names}>
          {/* Native name always renders in its own script's font. */}
          <AppText variant="bodyMedium" script={language.script}>
            {language.nativeName}
          </AppText>
          <AppText variant="bodySmall" color="textSecondary" script="latin">
            {language.englishName}
          </AppText>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : selected ? (
          <AppIcon icon={Check} size="md" color="primary" strokeWidth={2.5} />
        ) : null}
      </Pressable>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  card: { paddingVertical: t.spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.layout.minTouchTarget,
    paddingVertical: t.spacing.md,
  },
  pressed: { opacity: t.layout.pressedOpacity },
  names: { flex: 1 },
  divider: { height: t.layout.hairline, backgroundColor: t.colors.border },
}));
