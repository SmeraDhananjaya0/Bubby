import React, { useId, useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { Txt } from './Txt';
import { colors, spacing } from '@/theme/tokens';

type Props = {
  values: number[];
  color?: string;
  height?: number;
  startLabel: string;
  endLabel?: string;
};

function smoothPath(pts: [number, number][]) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/** Smoothed area-line chart for weekly miles. Fills the card width. */
export function TrendChart({ values, color = colors.violet.fill, height = 120, startLabel, endLabel = 'This week' }: Props) {
  const { width: screenW } = useWindowDimensions();
  const gradId = `trendFill-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const width = screenW - spacing.screenX * 2 - spacing.cardX * 2;
  const { line, area, last } = useMemo(() => {
    const top = 10, base = height - 22;
    const min = Math.min(...values) - 3, max = Math.max(...values) + 3;
    const pts = values.map<[number, number]>((v, i) => [(i / (values.length - 1)) * width, top + (1 - (v - min) / (max - min)) * (base - top)]);
    const l = smoothPath(pts);
    return { line: l, area: `${l} L${width} ${base} L0 ${base} Z`, last: pts[pts.length - 1] };
  }, [values, width, height]);
  const base = height - 22;
  return (
    <View style={{ gap: 6 }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.28} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line x1={0} y1={base} x2={width} y2={base} stroke={colors.track} strokeWidth={1} />
        <Line x1={0} y1={base / 2 + 5} x2={width} y2={base / 2 + 5} stroke={colors.field} strokeWidth={1} strokeDasharray="3 4" />
        <Path d={area} fill={`url(#${gradId})`} />
        <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={last[0]} cy={last[1]} r={5} fill={colors.white} stroke={color} strokeWidth={2.5} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt v="micro">{startLabel}</Txt>
        <Txt v="micro">{endLabel}</Txt>
      </View>
    </View>
  );
}
