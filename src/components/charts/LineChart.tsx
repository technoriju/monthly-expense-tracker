import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

/** Charts with more points than this draw no per-point dots (only the selected one). */
const MAX_DOTS = 31;

export interface LineChartProps {
  /** One value per point (e.g. minor units). Geometry only — never used for money math. */
  values: readonly number[];
  /** Resolved line/area color. */
  color: string;
  /** X-axis label per point; null hides the label. */
  labels: readonly (string | null)[];
  selectedIndex?: number | null;
  /** Makes every point tappable. */
  onSelect?: (index: number) => void;
  /** Spoken label for each tappable point. */
  pointLabel?: (index: number) => string;
  /** Spoken summary of the whole chart. */
  accessibilityLabel: string;
}

interface Point {
  x: number;
  y: number;
}

/** Smooth path through the points; control points share endpoint heights (no overshoot). */
function linePath(points: readonly Point[]): string {
  const [first, ...rest] = points;
  if (!first) return '';
  let d = `M ${first.x} ${first.y}`;
  let prev = first;
  for (const p of rest) {
    const mx = (prev.x + p.x) / 2;
    d += ` C ${mx} ${prev.y}, ${mx} ${p.y}, ${p.x} ${p.y}`;
    prev = p;
  }
  return d;
}

/** Area + line chart on react-native-svg, sized to its container. No animation. */
export function LineChart({
  values,
  color,
  labels,
  selectedIndex = null,
  onSelect,
  pointLabel,
  accessibilityLabel,
}: LineChartProps) {
  const styles = useStyles();
  const { colors, layout } = useTheme();
  const [width, setWidth] = useState(0);
  const height = layout.chartHeight;
  const pad = layout.chartSelectedPointRadius + layout.chartStrokeWidth;

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const max = Math.max(0, ...values);
  const count = values.length;
  const plotWidth = Math.max(width - pad * 2, 0);
  const points: Point[] = values.map((v, i) => ({
    x: count === 1 ? width / 2 : pad + (plotWidth * i) / Math.max(count - 1, 1),
    y: max > 0 ? pad + (1 - v / max) * (height - pad * 2) : height - pad,
  }));
  const line = linePath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const area =
    firstPoint && lastPoint && count > 1
      ? `${line} L ${lastPoint.x} ${height} L ${firstPoint.x} ${height} Z`
      : '';
  const selected = selectedIndex !== null ? points[selectedIndex] : undefined;

  return (
    <View onLayout={onLayout} accessibilityLabel={accessibilityLabel}>
      <View style={{ height }}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Line
              x1={0}
              x2={width}
              y1={height - layout.hairline}
              y2={height - layout.hairline}
              stroke={colors.border}
              strokeWidth={layout.hairline}
            />
            {area ? <Path d={area} fill={color} fillOpacity={layout.chartAreaOpacity} /> : null}
            {count > 1 ? (
              <Path d={line} stroke={color} strokeWidth={layout.chartStrokeWidth} fill="none" />
            ) : null}
            {count <= MAX_DOTS
              ? points.map((p, i) =>
                  (values[i] ?? 0) > 0 || count === 1 ? (
                    <Circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={layout.chartPointRadius}
                      fill={colors.surface}
                      stroke={color}
                      strokeWidth={layout.chartStrokeWidth}
                    />
                  ) : null,
                )
              : null}
            {selected ? (
              <>
                <Line
                  x1={selected.x}
                  x2={selected.x}
                  y1={0}
                  y2={height}
                  stroke={colors.border}
                  strokeWidth={layout.hairline}
                />
                <Circle
                  cx={selected.x}
                  cy={selected.y}
                  r={layout.chartSelectedPointRadius}
                  fill={color}
                  stroke={colors.surface}
                  strokeWidth={layout.chartStrokeWidth}
                />
              </>
            ) : null}
          </Svg>
        ) : null}
        {onSelect && width > 0 ? (
          <View style={styles.hitRow}>
            {values.map((_, i) => (
              <Pressable
                key={i}
                style={styles.hit}
                onPress={() => onSelect(i)}
                accessibilityRole="button"
                accessibilityLabel={pointLabel?.(i)}
                accessibilityState={{ selected: i === selectedIndex }}
              />
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.labels} importantForAccessibility="no-hide-descendants">
        {width > 0
          ? labels.map((label, i) => {
              const p = points[i];
              if (label === null || !p) return null;
              return (
                <AppText
                  key={i}
                  variant="caption"
                  color="textSecondary"
                  align="center"
                  numberOfLines={1}
                  style={[
                    styles.label,
                    {
                      left: Math.min(
                        Math.max(p.x - layout.chartLabelWidth / 2, 0),
                        width - layout.chartLabelWidth,
                      ),
                    },
                  ]}>
                  {label}
                </AppText>
              );
            })
          : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  hitRow: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  hit: { flex: 1 },
  labels: { height: t.spacing.xxl, marginTop: t.spacing.xs },
  label: { position: 'absolute', top: 0, width: t.layout.chartLabelWidth },
}));
