import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="start" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register-role" />
      <Stack.Screen name="register-farmer" />
      <Stack.Screen name="register-buyer" />
    </Stack>
  );
}
