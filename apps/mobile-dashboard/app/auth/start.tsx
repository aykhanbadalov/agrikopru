import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StartScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Ionicons name="leaf" size={72} color="#16a34a" />
        <Text style={styles.title}>AgriKöprü</Text>
        <Text style={styles.tagline}>Tarımsal Kredi Platformu</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primary} onPress={() => router.push('/auth/login')}>
          <Text style={styles.primaryText}>Giriş Yap</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/auth/register-role')}>
          <Text style={styles.secondaryText}>Kayıt Ol</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f0fdf4',
    justifyContent: 'space-between', padding: 32,
  },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  title: { fontSize: 42, fontWeight: '900', color: '#15803d' },
  tagline: { fontSize: 16, color: '#6b7280' },
  actions: { gap: 12, paddingBottom: 16 },
  primary: {
    backgroundColor: '#16a34a', borderRadius: 14,
    paddingVertical: 17, alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  secondary: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 17,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#16a34a',
  },
  secondaryText: { color: '#16a34a', fontSize: 18, fontWeight: '700' },
});
