import { Stack } from 'expo-router';

export default function FarmerLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'AgriKöprü — Çiftçi Girişi' }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="confirm" options={{ title: 'Sözleşme Onayı' }} />
    </Stack>
  );
}
