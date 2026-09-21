import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { Txt } from '@/components';
import { colors, fonts, hues } from '@/theme/tokens';

/** Inline validation message under a field. Renders nothing when there is no error. */
export function FieldError({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <View style={fieldStyles.error} accessibilityLiveRegion="polite">
      <AlertCircle size={13} color={hues.amber.text} strokeWidth={2.4} />
      <Txt style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: hues.amber.text }}>{text}</Txt>
    </View>
  );
}

type NumberFieldProps = {
  label: string;
  value: number | undefined;
  unit?: string;
  onCommit: (n: number) => void;
  /** Called when an optional field is cleared. */
  onClear?: () => void;
  width?: number;
  placeholder?: string;
};

/** A right-aligned numeric field with a unit suffix. Keeps its own text state so typing
 *  (and clearing) feels natural, committing numbers upward. */
export function NumberField({ label, value, unit, onCommit, onClear, width = 90, placeholder }: NumberFieldProps) {
  const [text, setText] = useState(value == null ? '' : String(value));
  return (
    <View style={fieldStyles.row}>
      <Txt style={fieldStyles.label}>{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            const clean = t.replace(/[^0-9]/g, '');
            setText(clean);
            if (clean) onCommit(Number(clean));
            else onClear?.();
          }}
          keyboardType="numeric"
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={colors.caption}
          style={[fieldStyles.input, { minWidth: width }]}
          selectionColor={colors.accent.fill}
        />
        {unit ? <Txt style={fieldStyles.unit}>{unit}</Txt> : null}
      </View>
    </View>
  );
}

/** The onboarding form vocabulary: a row with a label on the left, the value on the right. */
export const fieldStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  stack: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink2, flexShrink: 0 },
  hint: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.caption, marginTop: -8, paddingBottom: 10 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 10, marginTop: -6 },
  input: { textAlign: 'right', fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink, padding: 0 },
  unit: { fontFamily: fonts.bold, fontSize: 14, color: colors.caption },
  textField: { height: 44, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.field, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  textArea: { minHeight: 88, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 13, backgroundColor: colors.field, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, color: colors.ink, textAlignVertical: 'top' },
});
