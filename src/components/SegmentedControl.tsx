import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Txt } from './Txt';
import { colors, fonts } from '@/theme/tokens';

type Props<T extends string> = {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** Compact height for inline use (the Sex picker). */
  compact?: boolean;
};

/** Grey track with a white raised segment for the selection. */
export function SegmentedControl<T extends string>({ options, value, onChange, compact }: Props<T>) {
  return (
    <View style={[styles.track, compact && styles.compactTrack]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[
              styles.seg,
              compact ? styles.compactSeg : { flex: 1 },
              on && { backgroundColor: colors.white, boxShadow: '0 1px 3px rgba(27, 26, 25, 0.12)' },
            ]}
          >
            <Txt style={{ fontFamily: fonts.bold, fontSize: 13, color: on ? colors.ink : colors.caption }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: colors.field },
  compactTrack: { padding: 3, borderRadius: 11 },
  seg: { height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  compactSeg: { paddingHorizontal: 12, borderRadius: 8 },
});
