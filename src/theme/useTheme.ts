import { use, useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import type { Theme } from './theme';
import { ThemeContext } from './ThemeProvider';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useTheme(): Theme {
  return use(ThemeContext);
}

/**
 * Creates a hook that builds a StyleSheet from the active theme, memoized per theme.
 * Usage: `const useStyles = makeStyles((t) => ({ root: { padding: t.spacing.lg } }));`
 */
export function makeStyles<T extends NamedStyles<T>>(
  // The intersection gives the factory's return value contextual style typing,
  // so literals like `flexDirection: 'row'` are not widened to `string`.
  factory: (theme: Theme) => T & NamedStyles<T>,
) {
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
