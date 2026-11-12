import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon, AppText } from '@/components/ui';
import type { Script } from '@/i18n/languages';
import { makeStyles } from '@/theme';

export interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  /** Render `value` in a specific script font (e.g. a language's native name). */
  valueScript?: Script;
  hint?: string;
  onPress?: () => void;
  disabled?: boolean;
  /** `danger` renders the icon and label in the expense color (destructive actions). */
  tone?: 'default' | 'danger';
  trailing?: ReactNode;
}

/** Icon + label + value row. Pressable rows show a chevron. */
export function SettingsRow({
  icon,
  label,
  value,
  valueScript,
  hint,
  onPress,
  disabled = false,
  tone = 'default',
  trailing,
}: SettingsRowProps) {
  const styles = useStyles();
  const color = disabled ? 'textMuted' : tone === 'danger' ? 'expenseText' : 'textPrimary';
  const a11yLabel = [label, value, hint].filter(Boolean).join(', ');

  const content = (
    <>
      <AppIcon icon={icon} size="md" color={color} />
      <View style={styles.text}>
        <AppText variant="body" color={color}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" color="textSecondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText
          variant="bodySmall"
          color="textSecondary"
          script={valueScript}
          style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {trailing}
      {onPress ? <AppIcon icon={ChevronRight} size="sm" color="textMuted" mirrorInRTL /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={styles.root}
        accessible
        accessibilityLabel={a11yLabel}
        accessibilityState={{ disabled }}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.layout.minTouchTarget,
    paddingVertical: t.spacing.md,
  },
  pressed: { opacity: t.layout.pressedOpacity },
  text: { flex: 1 },
  value: { flexShrink: 1 },
}));
