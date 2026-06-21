import { Stack } from 'expo-router';

export default function FarmerLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="confirm" options={{ title: 'Sözleşme Onayı' }} />
    </Stack>
  );
}
