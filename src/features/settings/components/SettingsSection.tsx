import { Children, Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppCard, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

/** Titled card grouping settings rows, with dividers between rows. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const styles = useStyles();
  const rows = Children.toArray(children);
  return (
    <View style={styles.root}>
      <AppText
        variant="bodySmall"
        color="textSecondary"
        accessibilityRole="header"
        style={styles.title}>
        {title}
      </AppText>
      <AppCard padding="lg" style={styles.card}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </AppCard>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.spacing.sm },
  title: { paddingHorizontal: t.spacing.xs },
  card: { paddingVertical: t.spacing.xs },
  divider: { height: t.layout.hairline, backgroundColor: t.colors.border },
}));
