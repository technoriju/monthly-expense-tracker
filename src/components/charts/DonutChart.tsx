import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { makeStyles, useTheme } from '@/theme';

export interface DonutSlice {
  key: string;
  /** Share of the whole, 0–1. */
  fraction: number;
  /** Resolved theme color. */
  color: string;
}

export interface DonutChartProps {
  slices: readonly DonutSlice[];
  size?: 'regular' | 'large';
  /** Content centered inside the ring (e.g. total amount + label). */
  children?: ReactNode;
  /** Spoken summary of the chart. */
  accessibilityLabel: string;
}

interface Arc {
  key: string;
  color: string;
  length: number;
  offset: number;
}

/** Stroke lengths and start offsets along the circumference, in slice order. */
function toArcs(slices: readonly DonutSlice[], circumference: number): Arc[] {
  const arcs: Arc[] = [];
  let offset = 0;
  for (const s of slices) {
    if (s.fraction <= 0) continue;
    const length = s.fraction * circumference;
    arcs.push({ key: s.key, color: s.color, length, offset });
    offset += length;
  }
  return arcs;
}

/** Ring chart on react-native-svg. With no data it draws an empty muted ring. */
export function DonutChart({
  slices,
  size = 'regular',
  children,
  accessibilityLabel,
}: DonutChartProps) {
  const styles = useStyles();
  const { colors, layout } = useTheme();
  const diameter = size === 'large' ? layout.donutLargeSize : layout.donutSize;
  const stroke = size === 'large' ? layout.donutLargeStrokeWidth : layout.donutStrokeWidth;
  const r = (diameter - stroke) / 2;
  const c = diameter / 2;
  const circumference = 2 * Math.PI * r;

  const arcs = toArcs(slices, circumference);

  return (
    <View
      style={[styles.root, { width: diameter, height: diameter }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}>
      <Svg width={diameter} height={diameter}>
        <Circle cx={c} cy={c} r={r} stroke={colors.border} strokeWidth={stroke} fill="none" />
        <G rotation={-90} origin={`${c}, ${c}`}>
          {arcs.map((arc) => (
            <Circle
              key={arc.key}
              cx={c}
              cy={c}
              r={r}
              stroke={arc.color}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </G>
      </Svg>
      <View style={[styles.center, { padding: stroke }]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  root: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
