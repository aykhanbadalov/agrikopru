import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    AsyncStorage.getItem('session').then((raw) => {
      if (raw) {
        const { role } = JSON.parse(raw);
        router.replace(role === 'buyer' ? '/(tabs)' : '/farmer/(tabs)/panelim');
      } else {
        router.replace('/auth/start');
      }
    });
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="farmer" />
    </Stack>
  );
}
