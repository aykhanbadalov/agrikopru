import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    AsyncStorage.getItem('userRole').then((role) => {
      if (role === 'buyer') router.replace('/(tabs)');
      else if (role === 'farmer') router.replace('/farmer/login');
      else router.replace('/role-select');
    });
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="role-select" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="farmer" />
    </Stack>
  );
}
