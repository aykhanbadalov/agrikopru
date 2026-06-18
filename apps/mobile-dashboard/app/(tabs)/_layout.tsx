import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
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

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        headerRight: () => <RoleChangeButton />,
        headerRightContainerStyle: { paddingRight: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Panel',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="credit"
        options={{
          title: 'Kredi Analizi',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contract"
        options={{
          title: 'Sözleşme Teklifi',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Aktif Portföy',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
