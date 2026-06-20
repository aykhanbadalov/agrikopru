import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
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
import { createContract, getFarmers, Farmer } from '../../services/api';

export default function SozlesmeTeklifiScreen() {
  const { farmerId: paramFarmerId } = useLocalSearchParams<{ farmerId?: string }>();

  const [buyers, setBuyers] = useState<Farmer[]>([]);
  const [buyerName, setBuyerName] = useState('');
  const [selectedFarmerId, setSelectedFarmerId] = useState(paramFarmerId ?? '');
  const [productType, setProductType] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalPreview =
    quantityKg && pricePerKg
      ? (parseFloat(quantityKg) * parseFloat(pricePerKg)).toLocaleString('tr-TR')
      : '—';

  useEffect(() => {
    AsyncStorage.getItem('buyerName').then((n) => { if (n) setBuyerName(n); });
    getFarmers(50).then(setBuyers).catch(() => {});
  }, []);

  useEffect(() => {
    if (paramFarmerId) setSelectedFarmerId(paramFarmerId);
  }, [paramFarmerId]);

  async function handleSubmit() {
    if (!buyerName || !selectedFarmerId || !productType || !quantityKg || !pricePerKg) {
      Alert.alert('Hata', 'Tüm alanları doldurun.');
      return;
    }
    setSubmitting(true);
    try {
      await AsyncStorage.setItem('buyerName', buyerName);
      await createContract({
        farmer_id: selectedFarmerId,
        buyer_name: buyerName,
        product_type: productType,
        quantity_kg: parseFloat(quantityKg),
        price_per_kg: parseFloat(pricePerKg),
      });
      Alert.alert('Başarılı', 'Teklif oluşturuldu!');
      setProductType('');
      setQuantityKg('');
      setPricePerKg('');
    } catch (err: any) {
      Alert.alert('Hata', err.message ?? 'Teklif gönderilemedi.');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedFarmer = buyers.find((f) => f.id === selectedFarmerId);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Field label="Alıcı Adı">
        <TextInput
          style={styles.input}
          value={buyerName}
          onChangeText={setBuyerName}
          placeholder="örnek: Ankara Taze Market"
        />
      </Field>

      <Field label="Çiftçi">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          {buyers.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[styles.chip, selectedFarmerId === f.id && styles.chipActive]}
              onPress={() => setSelectedFarmerId(f.id)}
            >
              <Text style={[styles.chipText, selectedFarmerId === f.id && styles.chipActiveText]}>
                {f.full_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {selectedFarmer && (
          <Text style={styles.selected}>{selectedFarmer.full_name} seçildi</Text>
        )}
      </Field>

      <Field label="Ürün Türü">
        <TextInput
          style={styles.input}
          value={productType}
          onChangeText={setProductType}
          placeholder="örnek: Buğda"
        />
      </Field>

      <Field label="Miktar (kg)">
        <TextInput
          style={styles.input}
          value={quantityKg}
          onChangeText={setQuantityKg}
          keyboardType="numeric"
          placeholder="örnek: 5000"
        />
      </Field>

      <Field label="Birim Fiyat (TL/kg)">
        <TextInput
          style={styles.input}
          value={pricePerKg}
          onChangeText={setPricePerKg}
          keyboardType="numeric"
          placeholder="örnek: 8.50"
        />
      </Field>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Toplam Değer (önizleme):</Text>
        <Text style={styles.totalValue}>{totalPreview} TL</Text>
      </View>

      <Text style={styles.bddk}>
        AgriKöprü ödeme aracılığında bulunmaz — bu teklif ön-satış anlaşmasıdır (BDDK sınırı).
      </Text>

      <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={submitting}>
        {submitting
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.btnText}>Teklif Oluştur</Text>
            </>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderRadius: 9, borderWidth: 1, borderColor: '#e5e7eb',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15,
  },
  chip: {
    borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db',
    paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, color: '#374151' },
  chipActiveText: { color: '#fff', fontWeight: '600' },
  selected: { fontSize: 13, color: '#16a34a', marginTop: 4 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#f0fdf4', borderRadius: 9, padding: 12, marginBottom: 12,
  },
  totalLabel: { fontSize: 14, color: '#374151' },
  totalValue: { fontSize: 15, fontWeight: '700', color: '#16a34a' },
  bddk: { fontSize: 12, color: '#9ca3af', marginBottom: 20, lineHeight: 18 },
  btn: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
