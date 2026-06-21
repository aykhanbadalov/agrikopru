import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import DemoOtpBanner from '../../components/DemoOtpBanner';
import OtpDigitInput from '../../components/OtpDigitInput';
import { confirmContract, Contract, sendConfirmOtp } from '../../services/api';

export default function FarmerConfirmScreen() {
  const { contractJson, farmerId } = useLocalSearchParams<{
    contractJson: string;
    farmerId: string;
  }>();
  const contract: Contract = JSON.parse(contractJson);

  const [demoCode, setDemoCode] = useState('');
  const [code, setCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    sendConfirmOtp(contract.id, farmerId)
      .then(({ demoCode: c }) => setDemoCode(c))
      .catch(() => Alert.alert('Hata', 'Doğrulama kodu gönderilemedi.'))
      .finally(() => setOtpLoading(false));
  }, []);

  async function handleConfirm() {
    if (code.length !== 6) {
      Alert.alert('Hata', 'Kod 6 haneli olmalıdır.');
      return;
    }
    setLoading(true);
    try {
      await confirmContract(contract.id, farmerId, code);
      Alert.alert('Başarılı', 'Sözleşme onaylandı!', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      if (err.status === 429) {
        Alert.alert('Hata', 'Çok fazla hatalı deneme. Lütfen 15 dakika bekleyin.');
        setCode('');
      } else if (err.status === 403) {
        Alert.alert('Hata', 'Yanlış kod.');
        setCode('');
      } else if (err.status === 404) {
        Alert.alert('Hata', 'Sözleşme bulunamadı.');
      } else {
        Alert.alert('Hata', err.message || 'Bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    try {
      const { demoCode: c } = await sendConfirmOtp(contract.id, farmerId);
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
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Sözleşme Onayı</Text>
          <Text style={styles.detail}>
            {contract.buyer_name} — {contract.product_type}
          </Text>
          <Text style={styles.value}>
            {Number(contract.total_value_tl).toLocaleString('tr-TR')} TL
          </Text>

          {otpLoading ? (
            <ActivityIndicator size="large" color="#16a34a" style={{ marginVertical: 24 }} />
          ) : (
            <OtpDigitInput value={code} onChangeText={setCode} autoFocus />
          )}

          {showResend && !otpLoading && (
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

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
              <Text style={styles.cancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              disabled={loading || otpLoading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.confirmText}>Onayla</Text>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>

        {!otpLoading && demoCode !== '' && (
          <DemoOtpBanner demoCode={demoCode} onAnimationEnd={() => setShowResend(true)} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  heading: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 6, textAlign: 'center' },
  detail: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 4 },
  value: { fontSize: 20, fontWeight: '700', color: '#166534', textAlign: 'center', marginBottom: 28 },
  resendBtn: { alignItems: 'center', marginBottom: 16 },
  resendText: { color: '#16a34a', fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  cancelText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  confirmBtn: {
    flex: 1, backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
