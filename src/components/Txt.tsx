import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { type } from '@/theme/tokens';

type Variant = keyof typeof type;

type Props = TextProps & {
  /** Type preset from tokens.type */
  v?: Variant;
  color?: string;
  style?: TextStyle | TextStyle[];
};

/** Text with a type preset applied: `<Txt v="title">Today</Txt>` */
export function Txt({ v = 'body', color, style, children, ...rest }: Props) {
  return (
    <Text {...rest} style={[type[v], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}
