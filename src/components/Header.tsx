import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Txt } from './Txt';

type Props = {
  eyebrow: string;
  title: string;
  /** Avatar, a pill button, a close button… */
  right?: React.ReactNode;
};

/** Screen header: uppercase eyebrow over a 36px title, optional right slot. */
export function Header({ eyebrow, title, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ gap: 4 }}>
        <Txt v="eyebrow">{eyebrow}</Txt>
        <Txt v="title">{title}</Txt>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 },
});
