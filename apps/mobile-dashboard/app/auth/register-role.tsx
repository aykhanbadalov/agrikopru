import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RegisterRoleScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Geri</Text>
      </TouchableOpacity>

      <View style={styles.inner}>
        <Text style={styles.title}>Nasıl kayıt olmak{'\n'}istersiniz?</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/auth/register-farmer')}
        >
          <Ionicons name="leaf-outline" size={40} color="#16a34a" />
          <Text style={styles.cardTitle}>Çiftçiyim</Text>
          <Text style={styles.cardDesc}>
            Kredinizi analiz edin, sözleşme teklifleri alın
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.cardBlue]}
          onPress={() => router.push('/auth/register-buyer')}
        >
          <Ionicons name="business-outline" size={40} color="#2563eb" />
          <Text style={[styles.cardTitle, styles.cardTitleBlue]}>Alıcı / Kooperatifim</Text>
          <Text style={styles.cardDesc}>
            Çiftçilerle ön satış sözleşmeleri yapın
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 24 },
  back: { marginBottom: 12 },
  backText: { color: '#6b7280', fontSize: 15 },
  inner: { flex: 1, justifyContent: 'center', gap: 16 },
  title: {
    fontSize: 26, fontWeight: '800', color: '#1f2937',
    marginBottom: 32, textAlign: 'center', lineHeight: 34,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    borderWidth: 1.5, borderColor: '#d1fae5',
  },
  cardBlue: { borderColor: '#bfdbfe' },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  cardTitleBlue: { color: '#2563eb' },
  cardDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
});
