import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authLogin } from '../../services/api';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('+90');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!phone.trim() || !password) {
      setError('Telefon ve şifre gereklidir.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await authLogin(phone.trim(), password);
      await AsyncStorage.setItem('session', JSON.stringify(session));
      if (session.role === 'farmer') {
        await AsyncStorage.setItem('currentFarmer', JSON.stringify(session.user));
      }
      router.replace(session.role === 'buyer' ? '/(tabs)' : '/farmer/(tabs)/panelim');
    } catch (e: any) {
      setError(e.message || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.inner, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>AgriKöprü</Text>
        <Text style={styles.subtitle}>Hesabınıza giriş yapın</Text>

        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={v => {
            if (!v.startsWith('+90')) { setPhone('+90'); return; }
            const digits = v.slice(3).replace(/\D/g, '').slice(0, 10);
            setPhone('+90' + digits);
          }}
          keyboardType="number-pad"
          autoComplete="tel"
          maxLength={13}
          placeholder="+905XXXXXXXXX"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Şifre</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Giriş Yap</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { flex: 1, padding: 28, justifyContent: 'center' },
  title: {
    fontSize: 34, fontWeight: '900', color: '#16a34a',
    textAlign: 'center', marginBottom: 6,
  },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14, fontSize: 16, color: '#1f2937', marginBottom: 18,
  },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  btn: {
    backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8, marginBottom: 20,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  back: { alignItems: 'center' },
  backText: { color: '#6b7280', fontSize: 15 },
});
