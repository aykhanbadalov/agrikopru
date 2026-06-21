import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authRegisterMultipart, extractCKS } from '../../services/api';

const CLIMATE_OPTIONS = [
  { label: 'Olumsuz\n(kuraklık/sel)', value: '0.7' },
  { label: 'Normal', value: '0.4' },
  { label: 'Olumlu', value: '0.15' },
] as const;

export default function RegisterFarmerScreen() {
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+90');
  const [password, setPassword] = useState('');
  const [nationalId, setNationalId] = useState('');

  const [cooperative, setCooperative] = useState(false);
  const [farmingYears, setFarmingYears] = useState('');
  const [tarsimScore, setTarsimScore] = useState('');
  const [fertilizerPurchases, setFertilizerPurchases] = useState('');
  const [climateRisk, setClimateRisk] = useState('');
  const [landSizeHa, setLandSizeHa] = useState('');

  const [cksFileUri, setCksFileUri] = useState<string | null>(null);
  const [cksLoading, setCksLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tarsimNum = parseFloat(tarsimScore);
  const tarsimOutOfRange = tarsimScore !== '' && !isNaN(tarsimNum) && (tarsimNum < 0 || tarsimNum > 100);
  const nationalIdInvalid = nationalId.length > 0 && nationalId.length !== 11;

  const canSubmit =
    !!cksFileUri &&
    !!landSizeHa &&
    !!farmingYears &&
    !!tarsimScore &&
    !!fertilizerPurchases &&
    !!climateRisk &&
    nationalId.length === 11 &&
    !!fullName.trim() &&
    phone.length === 13 &&
    password.length >= 8;

  async function handleCKSUpload() {
    Alert.alert('ÇKS Belgesi', 'Belgeyi nasıl yüklemek istersiniz?', [
      {
        text: 'Kamera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('İzin Gerekli', 'Kamera izni verilmedi.'); return; }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 });
          if (!result.canceled) await runOCR(result.assets[0].uri);
        },
      },
      {
        text: 'Galeri',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('İzin Gerekli', 'Galeri izni verilmedi.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
          if (!result.canceled) await runOCR(result.assets[0].uri);
        },
      },
      {
        text: 'Dosya',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'application/pdf'],
            copyToCacheDirectory: true,
          });
          if (!result.canceled) await runOCR(result.assets[0].uri);
        },
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  }

  async function runOCR(uri: string) {
    setCksFileUri(uri);
    setCksLoading(true);
    try {
      const result = await extractCKS(uri);
      if (result.land_size_ha !== null) {
        setLandSizeHa(result.land_size_ha.toFixed(4));
      }
      if (result.full_name) setFullName(result.full_name);
      if (result.national_id) setNationalId(result.national_id);
      if (result.phone) setPhone('+90' + result.phone.slice(-10));
      if (result.land_size_ha === null) {
        Alert.alert('OCR', 'Arazi büyüklüğü okunamadı. Lütfen elle girin.');
      }
    } catch {
      Alert.alert('Hata', 'ÇKS belgesi okunamadı.');
    } finally {
      setCksLoading(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const fields: Record<string, string> = {
        role: 'farmer',
        full_name: fullName.trim(),
        phone: phone.trim(),
        password,
        cooperative_member: String(cooperative),
        national_id: nationalId.trim(),
        farming_history_years: farmingYears,
        tarsim_history_score: tarsimScore,
        fertilizer_purchases: fertilizerPurchases,
        climate_risk_score: climateRisk,
        land_size_ha: landSizeHa,
      };
      const result = await authRegisterMultipart(fields, cksFileUri!);
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
        <Text style={styles.title}>Çiftçi Kaydı</Text>

        {/* ÇKS Belgesi — yalnız yükləmə düyməsi + təsdiq mesajı */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ÇKS Belgesi <Text style={styles.required}>*</Text>
          </Text>

          <TouchableOpacity style={styles.cksBtn} onPress={handleCKSUpload} disabled={cksLoading}>
            {cksLoading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name={cksFileUri ? 'checkmark-circle-outline' : 'camera-outline'} size={16} color="#fff" />
                  <Text style={styles.cksBtnText}>
                    {cksFileUri ? 'ÇKS Yüklendi — Tekrar Yükle' : 'ÇKS Belgesini Yükle'}
                  </Text>
                </>}
          </TouchableOpacity>

          {cksFileUri && (
            <Text style={styles.cksOk}>✓ Belge yüklendi, veriler aşağıda kontrol edin.</Text>
          )}
        </View>

        {/* Kişisel Bilgiler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>

          <Text style={styles.label}>Ad Soyad <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName}
            placeholder="Ali Yılmaz" placeholderTextColor="#9ca3af" />

          <Text style={styles.label}>Telefon <Text style={styles.required}>*</Text></Text>
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

          <Text style={styles.label}>Şifre <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholder="En az 8 karakter" placeholderTextColor="#9ca3af" />
          {password.length > 0 && password.length < 8 && (
            <Text style={styles.fieldWarn}>En az 8 karakter olmalıdır.</Text>
          )}

          <Text style={styles.label}>TC Kimlik No <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={nationalId} onChangeText={setNationalId}
            keyboardType="number-pad" maxLength={11}
            placeholder="11 haneli TC Kimlik No"
            placeholderTextColor="#9ca3af" />
          {nationalIdInvalid && (
            <Text style={styles.fieldWarn}>TC Kimlik No 11 haneli olmalıdır.</Text>
          )}
        </View>

        {/* Çiftçilik Bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Çiftçilik Bilgileri</Text>

          <Text style={styles.label}>Arazi Büyüklüğü (ha) <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={landSizeHa} onChangeText={setLandSizeHa}
            keyboardType="decimal-pad" placeholder="ÇKS'den otomatik doldurulur"
            placeholderTextColor="#9ca3af" />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Kooperatif Üyesi</Text>
            <Switch
              value={cooperative}
              onValueChange={setCooperative}
              trackColor={{ false: '#e5e7eb', true: '#86efac' }}
              thumbColor={cooperative ? '#16a34a' : '#9ca3af'}
            />
          </View>

          <Text style={styles.label}>Çiftçilik Geçmişi (yıl) <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={farmingYears} onChangeText={setFarmingYears}
            keyboardType="number-pad" placeholder="Örn: 10" placeholderTextColor="#9ca3af" />

          <Text style={styles.label}>TARSİM Skoru (0–100) <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={tarsimScore} onChangeText={setTarsimScore}
            keyboardType="decimal-pad" placeholder="Örn: 75" placeholderTextColor="#9ca3af" />
          {tarsimOutOfRange && (
            <Text style={styles.fieldWarn}>TARSİM skoru 0 ile 100 arasında olmalıdır.</Text>
          )}

          <Text style={styles.label}>Gübre Alımı (adet/yıl) <Text style={styles.required}>*</Text></Text>
          <TextInput style={styles.input} value={fertilizerPurchases}
            onChangeText={setFertilizerPurchases} keyboardType="number-pad"
            placeholder="Örn: 5" placeholderTextColor="#9ca3af" />

          <Text style={styles.label}>
            Bu mevsim iklim koşulları tarımınızı nasıl etkiledi?{' '}
            <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.radioGroup}>
            {CLIMATE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.radioBtn, climateRisk === opt.value && styles.radioBtnSelected]}
                onPress={() => setClimateRisk(opt.value)}
              >
                <Text style={[styles.radioBtnText, climateRisk === opt.value && styles.radioBtnTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {!cksFileUri && (
          <Text style={styles.cksRequired}>
            Devam etmek için ÇKS belgesi yüklemeniz gerekiyor.
          </Text>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !canSubmit}
        >
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
  content: { padding: 24, paddingBottom: 48 },
  back: { marginBottom: 16 },
  backText: { color: '#6b7280', fontSize: 15 },
  title: { fontSize: 26, fontWeight: '800', color: '#1f2937', marginBottom: 24 },
  required: { color: '#dc2626' },
  section: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 12, fontSize: 15, color: '#1f2937', marginBottom: 14,
  },
  fieldWarn: { color: '#b45309', fontSize: 12, marginTop: -10, marginBottom: 12 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  radioGroup: {
    flexDirection: 'row', gap: 8, marginBottom: 14,
  },
  radioBtn: {
    flex: 1, borderRadius: 8, borderWidth: 1.5, borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb', paddingVertical: 10, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  radioBtnSelected: {
    borderColor: '#16a34a', backgroundColor: '#f0fdf4',
  },
  radioBtnText: {
    fontSize: 12, fontWeight: '600', color: '#6b7280', textAlign: 'center',
  },
  radioBtnTextSelected: {
    color: '#15803d',
  },
  cksBtn: {
    backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginBottom: 8,
  },
  cksBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cksOk: { fontSize: 13, color: '#16a34a', fontWeight: '600', marginBottom: 4 },
  cksRequired: {
    fontSize: 13, color: '#dc2626', textAlign: 'center',
    marginBottom: 12, fontWeight: '500',
  },
  error: { color: '#dc2626', fontSize: 14, marginBottom: 14, textAlign: 'center' },
  btn: {
    backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { backgroundColor: '#86efac' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
