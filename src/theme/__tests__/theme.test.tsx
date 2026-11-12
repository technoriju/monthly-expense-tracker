import { render, screen } from '@testing-library/react-native';
import { Text, useColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settingsStore';

import { darkColors, lightColors, type ColorTokens } from '../colors';
import { darkTheme, lightTheme, resolveTheme } from '../theme';
import { ThemeProvider } from '../ThemeProvider';
import { useTheme } from '../useTheme';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

/** WCAG 2.x relative luminance of a #RRGGBB color. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

function bodyTextPairs(c: ColorTokens): [string, string, string][] {
  return [
    ['textPrimary on background', c.textPrimary, c.background],
    ['textPrimary on surface', c.textPrimary, c.surface],
    ['onPrimary on primary', c.onPrimary, c.primary],
    ['onInverseSurface on inverseSurface', c.onInverseSurface, c.inverseSurface],
  ];
}

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('%s palette body-text contrast (WCAG AA 4.5:1)', (_name, c: ColorTokens) => {
  it.each(bodyTextPairs(c))('%s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('primary as a link/icon color stays at least 3:1 on the background (UI components)', () => {
    expect(contrast(c.primary, c.background)).toBeGreaterThanOrEqual(3);
  });
});

/** Every token used for readable text, on every surface it is drawn on. */
function readableTextPairs(c: ColorTokens): [string, string, string][] {
  return [
    ['textSecondary on background', c.textSecondary, c.background],
    ['textSecondary on surface', c.textSecondary, c.surface],
    ['incomeText on surface', c.incomeText, c.surface],
    ['incomeText on background', c.incomeText, c.background],
    ['incomeText on incomeSoft', c.incomeText, c.incomeSoft],
    ['expenseText on surface', c.expenseText, c.surface],
    ['expenseText on background', c.expenseText, c.background],
    ['expenseText on expenseSoft', c.expenseText, c.expenseSoft],
    ['accentText on surface', c.accentText, c.surface],
    ['accentText on background', c.accentText, c.background],
    ['accentText on accentSoft', c.accentText, c.accentSoft],
    ['primaryText on surface', c.primaryText, c.surface],
    ['primaryText on background', c.primaryText, c.background],
    ['primaryText on primarySoft', c.primaryText, c.primarySoft],
  ];
}

describe.each([
  ['light', lightColors],
  ['dark', darkColors],
] as const)('%s palette readable text (WCAG AA 4.5:1)', (_name, c: ColorTokens) => {
  it.each(readableTextPairs(c))('%s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  // textMuted is reserved for icons, placeholders and inactive items (non-text, 3:1).
  it.each([
    ['background', c.background],
    ['surface', c.surface],
  ])('textMuted on %s stays at least 3:1', (_label, bg) => {
    expect(contrast(c.textMuted, bg)).toBeGreaterThanOrEqual(3);
  });
});

describe('resolveTheme', () => {
  it.each([
    ['light', 'dark', lightTheme],
    ['dark', 'light', darkTheme],
    ['system', 'dark', darkTheme],
    ['system', 'light', lightTheme],
    ['system', null, lightTheme],
  ] as const)('mode %s with device %s', (mode, device, expected) => {
    expect(resolveTheme(mode, device)).toBe(expected);
  });
});

function SchemeProbe() {
  const { scheme, colors } = useTheme();
  return <Text testID="probe">{`${scheme}:${colors.background}`}</Text>;
}

describe('ThemeProvider', () => {
  it('switches live when the saved mode or the device scheme changes', async () => {
    useSettingsStore.getState().applySettings({ themeMode: 'light' });
    await render(
      <ThemeProvider>
        <SchemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent(`light:${lightColors.background}`);

    await render(
      <ThemeProvider>
        <SchemeProbe />
      </ThemeProvider>,
    );
    useSettingsStore.getState().applySettings({ themeMode: 'dark' });
    expect(await screen.findByText(`dark:${darkColors.background}`)).toBeTruthy();

    jest.mocked(useColorScheme).mockReturnValue('dark');
    useSettingsStore.getState().applySettings({ themeMode: 'system' });
    expect(await screen.findByText(`dark:${darkColors.background}`)).toBeTruthy();
  });
});
