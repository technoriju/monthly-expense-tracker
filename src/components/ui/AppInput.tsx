import { useState, type ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { AppText } from './AppText';
import { useTypeStyle } from './useTypeStyle';

export interface AppInputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** Already-translated, visible label (also used as the accessibility label). */
  label: string;
  /** Keeps `label` for screen readers but does not render it (e.g. search fields). */
  labelHidden?: boolean;
  /** Content shown inside the field before the text (currency symbol, search icon). */
  prefix?: ReactNode;
  error?: string;
  helperText?: string;
}

export function AppInput({
  label,
  labelHidden = false,
  prefix,
  error,
  helperText,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: AppInputProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const typeStyle = useTypeStyle('body');
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.root}>
      {labelHidden ? null : (
        <AppText variant="bodyMedium" color="textPrimary">
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.field,
          multiline && styles.multiline,
          focused && styles.focused,
          error ? styles.errored : null,
        ]}>
        {prefix ? <View style={styles.prefix}>{prefix}</View> : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? helperText}
          placeholderTextColor={colors.textMuted}
          multiline={multiline}
          style={[typeStyle, styles.input, multiline && styles.multilineInput]}
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
      </View>
      {error ? (
        <AppText variant="bodySmall" color="expenseText" accessibilityLiveRegion="polite">
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
  field: {
    minHeight: t.layout.inputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.md,
    borderWidth: t.layout.borderWidth,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  multiline: { minHeight: t.layout.noteInputHeight, alignItems: 'flex-start' },
  prefix: { justifyContent: 'center' },
  input: {
    flex: 1,
    paddingVertical: t.spacing.md,
    color: t.colors.textPrimary,
    textAlign: 'auto',
  },
  multilineInput: { textAlignVertical: 'top' },
  focused: { borderColor: t.colors.primary },
  errored: { borderColor: t.colors.expense },
}));
