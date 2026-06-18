import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

async function pickRole(role: 'buyer' | 'farmer') {
  await AsyncStorage.setItem('userRole', role);
  if (role === 'buyer') router.replace('/(tabs)');
  else router.replace('/farmer/login');
}

export default function RoleSelect() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>AgriKöprü</Text>
      <Text style={styles.subtitle}>Rolünüzü seçin:</Text>

      <TouchableOpacity style={styles.btn} onPress={() => pickRole('buyer')}>
        <Text style={styles.btnText}>Alıcı / Kooperativ</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => pickRole('farmer')}>
        <Text style={[styles.btnText, styles.btnSecondaryText]}>Çiftçiyim</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#f0fdf4' },
  logo: { fontSize: 36, fontWeight: '800', color: '#166534', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#374151', marginBottom: 40 },
  btn: {
    width: '100%', backgroundColor: '#16a34a', borderRadius: 12,
    paddingVertical: 18, alignItems: 'center', marginBottom: 16,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#16a34a' },
  btnSecondaryText: { color: '#16a34a' },
});
