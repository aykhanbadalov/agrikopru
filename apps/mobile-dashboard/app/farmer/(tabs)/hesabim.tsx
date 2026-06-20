import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE_URL } from '../../../constants/config';
import { CKSExtractResult, Farmer, extractCKS } from '../../../services/api';

async function changeRole() {
  await AsyncStorage.removeItem('userRole');
  await AsyncStorage.removeItem('currentFarmer');
  router.replace('/role-select');
}

export default function HesabimScreen() {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [cksResult, setCksResult] = useState<CKSExtractResult | null>(null);
  const [cksLoading, setCksLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cksImageUri, setCksImageUri] = useState<string | null>(null);
  const [cksModalVisible, setCksModalVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('currentFarmer').then((raw) => {
      if (!raw) { router.replace('/farmer/login'); return; }
      setFarmer(JSON.parse(raw));
    });
  }, []);

  async function handleCKSUpload() {
    Alert.alert('ÇKS Belgesi', 'Belgeyi nasıl yüklemek istersiniz?', [
      {
        text: 'Kamera',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) { Alert.alert('İzin Gerekli', 'Kamera izni verilmedi.'); return; }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 });
          if (!result.canceled) { setSaved(false); await runOCR(result.assets[0].uri); }
        },
      },
      {
        text: 'Galeri',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) { Alert.alert('İzin Gerekli', 'Galeri izni verilmedi.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
          if (!result.canceled) { setSaved(false); await runOCR(result.assets[0].uri); }
        },
      },
      {
        text: 'Dosya',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['image/*', 'application/pdf'],
            copyToCacheDirectory: true,
          });
          if (!result.canceled) { setSaved(false); await runOCR(result.assets[0].uri); }
        },
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  }

  async function runOCR(uri: string) {
    setCksImageUri(uri);
    setCksLoading(true);
    try {
      const result = await extractCKS(uri);
      setCksResult(result);
    } catch {
      Alert.alert('Hata', 'ÇKS belgesi okunamadı.');
    } finally {
      setCksLoading(false);
    }
  }

  async function saveLandSize(ha: number) {
    if (!farmer) return;
    setSaveLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/farmers/${farmer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: farmer.full_name,
          phone: farmer.phone,
          cooperative_member: farmer.cooperative_member,
          land_size_ha: ha,
        }),
      });
      Alert.alert('Kaydedildi', `Arazi büyüklüğü ${ha.toFixed(4)} ha olarak kaydedildi.`);
      setSaved(true);
    } catch {
      Alert.alert('Hata', 'Kayıt başarısız.');
    } finally {
      setSaveLoading(false);
    }
  }

  if (!farmer) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  return (
    <>
    <Modal visible={cksModalVisible} animationType="slide" onRequestClose={() => setCksModalVisible(false)}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.modalClose} onPress={() => setCksModalVisible(false)}>
          <Text style={styles.modalCloseText}>✕</Text>
        </TouchableOpacity>
        {cksImageUri?.endsWith('.pdf') ? (
          <View style={styles.modalPdfNote}>
            <Text style={styles.modalPdfText}>Bu belge PDF olduğu için önizleme gösterilemiyor.</Text>
          </View>
        ) : (
          <Image source={{ uri: cksImageUri ?? '' }} style={styles.modalImage} resizeMode="contain" />
        )}
      </View>
    </Modal>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.infoCard}>
        <Text style={styles.infoName}>{farmer.full_name}</Text>
        <Text style={styles.infoPhone}>{farmer.phone}</Text>
      </View>

      <View style={styles.cksCard}>
        <Text style={styles.cksTitle}>ÇKS Belgesi</Text>
        <TouchableOpacity style={styles.cksBtn} onPress={handleCKSUpload} disabled={cksLoading}>
          {cksLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.cksBtnText}>Belge Yükle</Text>
          }
        </TouchableOpacity>

        {cksResult && (
          <View style={styles.cksResult}>
            {cksResult.land_size_ha !== null ? (
              <Text style={styles.cksHa}>Arazi: {cksResult.land_size_ha.toFixed(4)} ha</Text>
            ) : (
              <Text style={styles.cksWarn}>Arazi büyüklüğü okunamadı.</Text>
            )}
            {cksResult.confidence < 0.6 && (
              <Text style={styles.cksWarn}>⚠ Sənəd aydın deyil, el ile kontrol edin.</Text>
            )}
            {cksResult.warning && (
              <Text style={styles.cksWarn}>{cksResult.warning}</Text>
            )}
            {cksResult.land_size_ha !== null && (
              saved ? (
                <Text style={styles.savedText}>✓ Kaydedildi</Text>
              ) : (
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={() => saveLandSize(cksResult.land_size_ha!)}
                  disabled={saveLoading}
                >
                  {saveLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.saveBtnText}>Kaydet</Text>
                  }
                </TouchableOpacity>
              )
            )}
            {cksImageUri && (
              <TouchableOpacity style={styles.viewBtn} onPress={() => setCksModalVisible(true)}>
                <Text style={styles.viewBtnText}>Belgemi Gör</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.roleBtn} onPress={changeRole}>
        <Text style={styles.roleBtnText}>Rolü Değiştir</Text>
      </TouchableOpacity>
    </ScrollView>
    </>
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
  cksCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cksTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
  cksBtn: {
    backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  cksBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cksResult: { marginTop: 12 },
  cksHa: { fontSize: 16, fontWeight: '700', color: '#166534', marginBottom: 6 },
  cksWarn: { fontSize: 13, color: '#b45309', marginBottom: 4 },
  saveBtn: {
    marginTop: 8, backgroundColor: '#16a34a', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  savedText: { color: '#16a34a', fontWeight: '700', textAlign: 'center', marginTop: 8 },
  viewBtn: {
    marginTop: 8, backgroundColor: '#6b7280', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  viewBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  roleBtn: {
    backgroundColor: '#6b7280', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  roleBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalClose: {
    position: 'absolute', top: 48, right: 20, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  modalImage: { flex: 1, width: '100%' },
  modalPdfNote: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalPdfText: { color: '#9ca3af', fontSize: 16, textAlign: 'center' },
});
