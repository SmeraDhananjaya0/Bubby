import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export type Ring = { pct: number; color: string; track: string };

type Props = {
  size: number;
  stroke: number;
  /** Outer → inner. */
  rings: Ring[];
  gap?: number;
  children?: React.ReactNode;
};

/**
 * Concentric progress rings (calories / carbs / protein). Outer ring first.
 * Rounded caps, starting at 12 o'clock. Pass children to place a label in the middle.
 */
export function Rings({ size, stroke, rings, gap = 5, children }: Props) {
  const c = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((r, i) => {
          const radius = c - stroke / 2 - i * (stroke + gap);
          const circ = 2 * Math.PI * radius;
          const dash = circ * Math.min(1, Math.max(0, r.pct));
          return (
            <React.Fragment key={i}>
              <Circle cx={c} cy={c} r={radius} stroke={r.track} strokeWidth={stroke} fill="none" />
              <Circle
                cx={c}
                cy={c}
                r={radius}
                stroke={r.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                fill="none"
                transform={`rotate(-90 ${c} ${c})`}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
