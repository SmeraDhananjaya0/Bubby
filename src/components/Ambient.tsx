import React, { useId } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { ambients, colors } from '@/theme/tokens';

type Props = { preset: keyof typeof ambients };

/**
 * The ambient background: three soft radial glows over the warm ground.
 * Sits behind everything; the scroll content moves over it.
 */
export function Ambient({ preset }: Props) {
  const { width, height } = useWindowDimensions();
  const glows = ambients[preset];
  // Unique gradient ids: several screens stay mounted at once and SVG ids are document-global.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg
      pointerEvents="none"
      width={width}
      height={height}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.ground }]}
    >
      <Defs>
        {glows.map((g, i) => (
          <RadialGradient key={i} id={`glow-${uid}-${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={g.color} stopOpacity={g.alpha} />
            <Stop offset="0.7" stopColor={g.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      {glows.map((g, i) => (
        <Ellipse
          key={i}
          cx={(g.cx / 100) * width}
          cy={(g.cy / 100) * height}
          rx={(g.rx / 100) * width}
          ry={(g.ry / 100) * height}
          fill={`url(#glow-${uid}-${i})`}
        />
      ))}
    </Svg>
  );
}
