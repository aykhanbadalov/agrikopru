import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authRegister } from '../../services/api';

export default function RegisterBuyerScreen() {
  const insets = useSafeAreaInsets();
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('+90');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!companyName.trim() || !phone.trim() || !password) {
      setError('Tüm alanlar zorunludur.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authRegister({
        role: 'buyer',
        company_name: companyName.trim(),
        phone: phone.trim(),
        password,
      });
      router.replace(
        `/auth/verify-otp?phone=${encodeURIComponent(result.phone)}&role=${result.role}&demoCode=${result.demoCode}`
      );
    } catch (e: any) {
      setError(e.message || 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Alıcı Kaydı</Text>

        <Text style={styles.label}>Şirket Adı *</Text>
        <TextInput
          style={styles.input}
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="ABC Tarım A.Ş."
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Telefon *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={v => {
            if (!v.startsWith('+90')) { setPhone('+90'); return; }
            const digits = v.slice(3).replace(/\D/g, '').slice(0, 10);
            setPhone('+90' + digits);
          }}
          keyboardType="number-pad"
          maxLength={13}
          placeholder="+905XXXXXXXXX"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Şifre *</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="En az 8 karakter"
          placeholderTextColor="#9ca3af"
        />
        {password.length > 0 && password.length < 8 && (
          <Text style={styles.fieldWarn}>En az 8 karakter olmalıdır.</Text>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Kayıt Ol</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 24 },
  back: { marginBottom: 16 },
  backText: { color: '#6b7280', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', color: '#1f2937', marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14, fontSize: 16, color: '#1f2937', marginBottom: 4,
  },
  fieldWarn: { color: '#b45309', fontSize: 12, marginBottom: 12 },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12 },
  btn: {
    backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 16,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
