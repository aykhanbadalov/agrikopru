import { useRef } from 'react';
import { StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  autoFocus?: boolean;
};

export default function OtpDigitInput({ value, onChangeText, autoFocus }: Props) {
  const inputRef = useRef<TextInput>(null);

  return (
    <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
      <View style={styles.container}>
        <View style={styles.boxes} pointerEvents="none">
          {Array.from({ length: 6 }).map((_, i) => {
            const isActive = i === value.length && value.length < 6;
            const isFilled = i < value.length;
            return (
              <View
                key={i}
                style={[
                  styles.box,
                  isFilled && styles.boxFilled,
                  isActive && styles.boxActive,
                ]}
              >
                <Text style={styles.digit}>{value[i] ?? ''}</Text>
              </View>
            );
          })}
        </View>
        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          value={value}
          onChangeText={v => onChangeText(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          caretHidden
          selectionColor="transparent"
          autoFocus={autoFocus}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', marginBottom: 20 },
  boxes: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  box: {
    width: 48,
    height: 58,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: '#374151' },
  boxActive: {
    borderWidth: 2,
    borderColor: '#16a34a',
    shadowColor: '#16a34a',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  digit: { fontSize: 22, fontWeight: '700', color: '#1f2937' },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    color: 'transparent',
    backgroundColor: 'transparent',
  },
});
