import type { DonutSlice } from '@/components/charts/DonutChart';
import type { ColorTokens } from '@/theme';

import type { CategoryShare } from './types';

/** Distinct slice colors (categories share only five tones, so slices are colored by rank). */
export const MAX_COLORED_SLICES = 5;

export const OTHER_SLICE_KEY = 'other-categories';

function seriesColors(colors: ColorTokens): string[] {
  const { chart } = colors;
  return [chart.blue, chart.purple, chart.orange, chart.pink, chart.cyan];
}

/** Color for the category at `rank` (0 = largest); ranks beyond the palette are muted. */
export function shareColor(rank: number, colors: ColorTokens): string {
  return seriesColors(colors)[rank] ?? colors.textMuted;
}

/**
 * Donut slices for category shares: the top five keep their own color, the rest are merged
 * into one muted "other categories" slice so the ring stays readable.
 */
export function donutSlices(shares: readonly CategoryShare[], colors: ColorTokens): DonutSlice[] {
  const slices: DonutSlice[] = shares.slice(0, MAX_COLORED_SLICES).map((share, rank) => ({
    key: String(share.category.id),
    fraction: share.fraction,
    color: shareColor(rank, colors),
  }));
  const rest = shares.slice(MAX_COLORED_SLICES).reduce((sum, s) => sum + s.fraction, 0);
  if (rest > 0) slices.push({ key: OTHER_SLICE_KEY, fraction: rest, color: colors.textMuted });
  return slices;
}
