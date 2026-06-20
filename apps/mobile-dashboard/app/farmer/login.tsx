import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { getFarmerByPhone, Farmer } from '../../services/api';

export default function FarmerLoginScreen() {
  const [phone, setPhone] = useState('+90');
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    if (phone.trim().length < 10) {
      Alert.alert('Hata', 'Geçerli bir telefon numarası girin.');
      return;
    }
    setLoading(true);
    try {
      const farmer: Farmer = await getFarmerByPhone(phone.trim());
      await AsyncStorage.setItem('currentFarmer', JSON.stringify(farmer));
      router.replace('/farmer/(tabs)/panelim');
    } catch (err: any) {
      if (err.status === 404) {
        Alert.alert('Bulunamadı', 'Bu numara kayıtlı değil.');
      } else {
        Alert.alert('Hata', 'Bağlantı hatası. Lütfen tekrar deneyin.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>AgriKöprü</Text>
        <Text style={styles.subtitle}>Telefon numaranızı girin:</Text>

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+90 500 123 45 67"
          autoFocus
        />

        <TouchableOpacity style={styles.btn} onPress={handleNext} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Devam Et</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f0fdf4' },
  container: {
    flexGrow: 1, justifyContent: 'center', padding: 28,
  },
  logo: { fontSize: 32, fontWeight: '800', color: '#166534', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#374151', marginBottom: 24, textAlign: 'center' },
  input: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db',
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 17, marginBottom: 18,
  },
  btn: {
    backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 15, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
