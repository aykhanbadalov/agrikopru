import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';

async function changeRole() {
  await AsyncStorage.removeItem('userRole');
  router.replace('/role-select');
}

function RoleChangeButton() {
  return (
    <TouchableOpacity onPress={changeRole} style={{ marginRight: 16 }}>
      <Ionicons name="swap-horizontal-outline" size={22} color="#2563eb" />
    </TouchableOpacity>
  );
}

export default function FarmerLayout() {
  return (
    <Stack
      screenOptions={{
        headerRight: () => <RoleChangeButton />,
      }}
    >
      <Stack.Screen name="login" options={{ title: 'AgriKöprü — Çiftçi Girişi' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Panelim' }} />
      <Stack.Screen name="contracts" options={{ title: 'Sözleşmelerim' }} />
      <Stack.Screen name="confirm" options={{ title: 'Sözleşme Onayı' }} />
    </Stack>
  );
}
