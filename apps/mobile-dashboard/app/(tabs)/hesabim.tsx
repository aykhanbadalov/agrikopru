import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Buyer, Session, authChangePassword } from '../../services/api';

async function logout() {
  await AsyncStorage.multiRemove(['session', 'currentFarmer', 'userRole']);
  router.replace('/auth/start');
}

export default function BuyerHesabimScreen() {
  const [user, setUser] = useState<Buyer | null>(null);

  const [cpOld, setCpOld] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpRepeat, setCpRepeat] = useState('');
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('session').then((raw) => {
      if (!raw) { router.replace('/auth/start'); return; }
      const session: Session = JSON.parse(raw);
      setUser(session.user as Buyer);
    });
  }, []);

  async function handleChangePassword() {
    if (!cpOld || !cpNew || !cpRepeat) { setCpError('Tüm alanlar zorunludur.'); return; }
    if (cpNew !== cpRepeat) { setCpError('Yeni şifreler eşleşmiyor.'); return; }
    setCpError(null);
    setCpLoading(true);
    try {
      await authChangePassword(user!.phone, 'buyer', cpOld, cpNew);
      setCpSuccess(true);
      setCpOld(''); setCpNew(''); setCpRepeat('');
    } catch (e: any) {
      setCpError(e.message || 'Şifre değiştirilemedi.');
    } finally {
      setCpLoading(false);
    }
  }

  if (!user) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.infoCard}>
        <Text style={styles.infoName}>{user.company_name}</Text>
        <Text style={styles.infoPhone}>{user.phone}</Text>
      </View>

      <View style={styles.pwCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="key-outline" size={15} color="#6b7280" />
          <Text style={styles.sectionTitle}>Şifreyi Değiştir</Text>
        </View>
        <TextInput
          style={styles.input}
          value={cpOld}
          onChangeText={v => { setCpOld(v); setCpSuccess(false); setCpError(null); }}
          secureTextEntry
          placeholder="Mevcut şifre"
          placeholderTextColor="#9ca3af"
        />
        <TextInput
          style={styles.input}
          value={cpNew}
          onChangeText={v => { setCpNew(v); setCpError(null); }}
          secureTextEntry
          placeholder="Yeni şifre (en az 8 karakter)"
          placeholderTextColor="#9ca3af"
        />
        {cpNew.length > 0 && cpNew.length < 8 && (
          <Text style={styles.fieldWarn}>En az 8 karakter olmalıdır.</Text>
        )}
        <TextInput
          style={styles.input}
          value={cpRepeat}
          onChangeText={v => { setCpRepeat(v); setCpError(null); }}
          secureTextEntry
          placeholder="Yeni şifre tekrar"
          placeholderTextColor="#9ca3af"
        />
        {cpError && <Text style={styles.error}>{cpError}</Text>}
        {cpSuccess && <Text style={styles.success}>Şifre güncellendi.</Text>}
        <TouchableOpacity style={styles.pwBtn} onPress={handleChangePassword} disabled={cpLoading}>
          {cpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.pwBtnText}>Güncelle</Text>}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() =>
          Alert.alert('Çıkış Yap', 'Çıkış yapmak istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
          ])
        }
      >
        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
        <Text style={styles.logoutBtnText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  infoName: { fontSize: 20, fontWeight: '800', color: '#1f2937', marginBottom: 4 },
  infoPhone: { fontSize: 15, color: '#6b7280' },
  pwCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginLeft: 5 },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 12, fontSize: 15, color: '#1f2937', marginBottom: 12,
  },
  fieldWarn: { color: '#b45309', fontSize: 12, marginTop: -8, marginBottom: 10 },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  success: { color: '#16a34a', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  pwBtn: {
    backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  pwBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  logoutBtn: {
    backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  logoutBtnText: { color: '#dc2626', fontSize: 16, fontWeight: '700' },
});
