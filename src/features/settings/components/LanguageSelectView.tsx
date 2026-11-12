import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppCard, AppHeader, AppScreen, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

import { useLanguageSettings } from '../hooks/useLanguageSettings';
import { RadioOptionRow } from './RadioOptionRow';

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
            // Native name always renders in its own script's font.
            <RadioOptionRow
              key={lang.code}
              label={lang.nativeName}
              labelScript={lang.script}
              description={lang.englishName}
              descriptionScript="latin"
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

const useStyles = makeStyles((t) => ({
  card: { paddingVertical: t.spacing.xs },
}));
