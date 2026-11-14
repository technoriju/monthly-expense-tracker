/** Numeric version parts, e.g. "1.10.0" → [1, 10, 0]. */
export type VersionParts = readonly [number, number, number];

const VERSION_PATTERN = /^v?(\d{1,6})(?:\.(\d{1,6}))?(?:\.(\d{1,6}))?(?:[-+].*)?$/;

/**
 * Parses "major[.minor[.patch]]" (an optional leading "v" and any "-pre"/"+build" suffix are
 * ignored). Missing parts count as 0. Returns null for anything else.
 */
export function parseVersion(value: string): VersionParts | null {
  const match = VERSION_PATTERN.exec(value.trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
}

export function isVersion(value: string): boolean {
  return parseVersion(value) !== null;
}

/**
 * Numeric, part-by-part comparison (so 1.10.0 > 1.9.0). Returns -1 / 0 / 1, or null when
 * either side is not a valid version.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 | null {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}
