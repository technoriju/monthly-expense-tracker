import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppCard, AppHeader, AppScreen } from '@/components/ui';
import { makeStyles } from '@/theme';

import { useThemeSettings } from '../hooks/useThemeSettings';
import { RadioOptionRow } from './RadioOptionRow';

export function ThemeSelectView() {
  const styles = useStyles();
  const { t } = useTranslation('settings');
  const { themeMode, options, setThemeMode } = useThemeSettings();

  return (
    <AppScreen
      header={<AppHeader title={t('theme.title')} back />}
      edges={['top', 'left', 'right', 'bottom']}>
      <AppCard padding="lg" style={styles.card}>
        <View accessibilityRole="radiogroup">
          {options.map((mode, i) => (
            <RadioOptionRow
              key={mode}
              label={t(`theme.${mode}`)}
              description={mode === 'system' ? t('theme.systemHint') : undefined}
              selected={mode === themeMode}
              showDivider={i > 0}
              onPress={() => setThemeMode(mode)}
            />
          ))}
        </View>
      </AppCard>
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  card: { paddingVertical: t.spacing.xs },
}));
