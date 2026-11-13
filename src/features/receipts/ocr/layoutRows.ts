import type { OcrBox, OcrLine } from './types';

/**
 * Text engines group receipt text into blocks — often one block of item names and another of
 * prices — so reading blocks in order separates each name from its price. This rebuilds the
 * printed rows from bounding boxes: lines whose vertical centres are within half a line height
 * belong to the same row, joined left to right, rows ordered top to bottom.
 * Lines without a box keep their position after the laid-out rows (nothing is dropped).
 */
export function layoutRows(lines: readonly OcrLine[]): OcrLine[] {
  const boxed = lines.filter(
    (l): l is OcrLine & { box: OcrBox } => l.box !== null && l.box.height > 0,
  );
  const unboxed = lines.filter((l) => l.box === null || l.box.height <= 0);
  if (boxed.length === 0) return [...lines];

  const heights = boxed.map((l) => l.box.height).sort((a, b) => a - b);
  const median = heights[Math.floor(heights.length / 2)] ?? 1;
  const tolerance = median / 2;
  const centre = (l: { box: OcrBox }) => l.box.y + l.box.height / 2;

  const rows: { centre: number; parts: (OcrLine & { box: OcrBox })[] }[] = [];
  for (const line of [...boxed].sort((a, b) => centre(a) - centre(b))) {
    const row = rows.find((r) => Math.abs(r.centre - centre(line)) <= tolerance);
    if (row) {
      row.parts.push(line);
      row.centre = row.parts.reduce((sum, p) => sum + centre(p), 0) / row.parts.length;
    } else {
      rows.push({ centre: centre(line), parts: [line] });
    }
  }

  const merged = rows
    .sort((a, b) => a.centre - b.centre)
    .map(({ parts }): OcrLine => {
      const sorted = parts.sort((a, b) => a.box.x - b.box.x);
      const known = sorted.map((p) => p.confidence).filter((c): c is number => c !== null);
      const left = Math.min(...sorted.map((p) => p.box.x));
      const top = Math.min(...sorted.map((p) => p.box.y));
      const right = Math.max(...sorted.map((p) => p.box.x + p.box.width));
      const bottom = Math.max(...sorted.map((p) => p.box.y + p.box.height));
      return {
        text: sorted.map((p) => p.text.trim()).join('  '),
        confidence: known.length === sorted.length ? Math.min(...known) : null,
        box: { x: left, y: top, width: right - left, height: bottom - top },
      };
    });
  return [...merged, ...unboxed];
}
