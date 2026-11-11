import { ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppIcon, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  /** Shows a "See all →" link. */
  onSeeAll?: () => void;
}

export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  return (
    <View style={styles.root}>
      <AppText variant="heading3" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="link"
          accessibilityLabel={t('actions.seeAll')}
          hitSlop={12}
          style={styles.link}>
          <AppText variant="bodySmall" color="primary">
            {t('actions.seeAll')}
          </AppText>
          <AppIcon icon={ArrowRight} size="sm" color="primary" mirrorInRTL />
        </Pressable>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: t.spacing.md,
  },
  title: { flexShrink: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
}));
