import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  demoCode: string;
  onAnimationEnd: () => void;
};

export default function DemoOtpBanner({ demoCode, onAnimationEnd }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-160)).current;
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
    translateY.setValue(-160);
    const anim = Animated.sequence([
      Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(5000),
      Animated.timing(translateY, { toValue: -160, duration: 300, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (finished) onAnimationEnd();
    });
    return () => anim.stop();
  }, [demoCode]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + 10, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.icon}>📩</Text>
        <View style={styles.body}>
          <Text style={styles.appName}>AgriKöprü</Text>
          <Text style={styles.message} numberOfLines={1}>
            Demo doğrulama kodunuz: {demoCode}
          </Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(242,242,247,0.97)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 16,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 26 },
  body: { flex: 1 },
  appName: { fontSize: 12, fontWeight: '700', color: '#374151' },
  message: { fontSize: 13, color: '#1f2937', marginTop: 2 },
  time: { fontSize: 11, color: '#9ca3af', alignSelf: 'flex-start' },
});
