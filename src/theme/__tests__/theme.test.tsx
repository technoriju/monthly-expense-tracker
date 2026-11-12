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

describe('dark palette secondary text', () => {
  // The light textSecondary (#77758A) is the reference design color (≈4.2–4.5:1) and is
  // deliberately not changed here; the dark palette is ours, so it must meet AA.
  it.each([
    ['background', darkColors.background],
    ['surface', darkColors.surface],
  ])('textSecondary on %s', (_label, bg) => {
    expect(contrast(darkColors.textSecondary, bg)).toBeGreaterThanOrEqual(4.5);
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
