import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DemoOtpBanner from '../../components/DemoOtpBanner';
import OtpDigitInput from '../../components/OtpDigitInput';
import { authResendOtp, authVerifyRegistration } from '../../services/api';

export default function VerifyOtpScreen() {
  const insets = useSafeAreaInsets();
  const { phone, role, demoCode: initialCode } = useLocalSearchParams<{
    phone: string;
    role: 'farmer' | 'buyer';
    demoCode: string;
  }>();

  const [demoCode, setDemoCode] = useState(initialCode ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function handleVerify() {
    if (code.length !== 6) { setError('6 haneli kodu eksiksiz girin.'); return; }
    setLoading(true);
    setError(null);
    try {
      const session = await authVerifyRegistration(phone, role, code);
      await AsyncStorage.setItem('session', JSON.stringify(session));
      if (role === 'farmer') {
        await AsyncStorage.setItem('currentFarmer', JSON.stringify(session.user));
        router.replace('/farmer/(tabs)/panelim');
      } else {
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e.message || 'Doğrulama başarısız.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    try {
      const { demoCode: c } = await authResendOtp(phone, role);
      setDemoCode(c);
      setShowResend(false);
      setCode('');
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Kod gönderilemedi.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Telefon Doğrulama</Text>
            <Text style={styles.subtitle}>
              {phone} numarasına gönderilen kodu girin.
            </Text>

            <OtpDigitInput value={code} onChangeText={setCode} autoFocus />

            {showResend && (
              <TouchableOpacity
                onPress={handleResend}
                disabled={resendLoading}
                style={styles.resendBtn}
              >
                {resendLoading
                  ? <ActivityIndicator size="small" color="#16a34a" />
                  : <Text style={styles.resendText}>Yeni kod gönder</Text>}
              </TouchableOpacity>
            )}

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btn, code.length !== 6 && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={loading || code.length !== 6}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Doğrula</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>← Geri dön</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <DemoOtpBanner demoCode={demoCode} onAnimationEnd={() => setShowResend(true)} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 24, paddingBottom: 48 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  resendBtn: { alignItems: 'center', marginBottom: 12 },
  resendText: { color: '#16a34a', fontSize: 14, fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  btn: {
    backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 4,
  },
  btnDisabled: { backgroundColor: '#86efac' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backLink: { alignItems: 'center', marginTop: 20 },
  backLinkText: { color: '#6b7280', fontSize: 14 },
});
