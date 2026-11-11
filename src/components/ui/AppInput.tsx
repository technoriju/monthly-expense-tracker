import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { AppText } from './AppText';
import { useTypeStyle } from './useTypeStyle';

export interface AppInputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** Already-translated, visible label (also used as the accessibility label). */
  label: string;
  error?: string;
  helperText?: string;
}

export function AppInput({ label, error, helperText, onFocus, onBlur, ...rest }: AppInputProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const typeStyle = useTypeStyle('body');
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.root}>
      <AppText variant="bodyMedium" color="textPrimary">
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? helperText}
        placeholderTextColor={colors.textMuted}
        style={[typeStyle, styles.input, focused && styles.focused, error ? styles.errored : null]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <AppText variant="bodySmall" color="expense" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="bodySmall" color="textSecondary">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { gap: t.spacing.sm },
  input: {
    minHeight: t.layout.inputHeight,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderRadius: t.radius.md,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    color: t.colors.textPrimary,
    textAlign: 'auto',
  },
  focused: { borderColor: t.colors.primary },
  errored: { borderColor: t.colors.expense },
}));
