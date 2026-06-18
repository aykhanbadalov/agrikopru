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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { confirmContract, Contract } from '../../services/api';

export default function FarmerConfirmScreen() {
  const { contractJson, farmerId } = useLocalSearchParams<{
    contractJson: string;
    farmerId: string;
  }>();
  const contract: Contract = JSON.parse(contractJson);

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (pin.length !== 4) {
      Alert.alert('Hata', 'PIN 4 haneli olmalıdır.');
      return;
    }
    setLoading(true);
    try {
      await confirmContract(contract.id, farmerId, pin);
      Alert.alert('Başarılı', 'Sözleşme onaylandı!', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      if (err.status === 429) {
        Alert.alert('Hata', 'Çok fazla hatalı deneme. Lütfen 15 dakika bekleyin.');
        setPin('');
      } else if (err.status === 403) {
        Alert.alert('Hata', 'Yanlış PIN.');
        setPin('');
      } else if (err.status === 404) {
        Alert.alert('Hata', 'Sözleşme bulunamadı.');
      } else {
        Alert.alert('Hata', 'Bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  }

  const masked = '*'.repeat(pin.length).padEnd(4, '_');

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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

        <Text style={styles.pinLabel}>PIN kodunuzu girin:</Text>
        <TextInput
          style={styles.pinInput}
          value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="numeric"
          secureTextEntry
          maxLength={4}
          placeholder="_ _ _ _"
          textAlign="center"
        />
        <Text style={styles.masked}>{masked.split('').join('  ')}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.confirmText}>Onayla</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  container: {
    flexGrow: 1, justifyContent: 'center', padding: 24,
  },
  heading: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 6, textAlign: 'center' },
  detail: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 4 },
  value: { fontSize: 20, fontWeight: '700', color: '#166534', textAlign: 'center', marginBottom: 32 },
  pinLabel: { fontSize: 15, color: '#374151', fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  pinInput: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db',
    paddingVertical: 14, fontSize: 24, letterSpacing: 10, marginBottom: 8,
  },
  masked: { fontSize: 24, letterSpacing: 12, textAlign: 'center', color: '#374151', marginBottom: 32 },
  actions: { flexDirection: 'row', gap: 12 },
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
