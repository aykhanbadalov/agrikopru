import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE_URL } from '../../../constants/config';
import {
  CKSExtractResult,
  Farmer,
  authChangePassword,
  getCKSDocument,
} from '../../../services/api';

function ProfileRow({ icon, label, children }: {
  icon: string; label: string; children: React.ReactNode;
}) {
  return (
    <View style={styles.profileRow}>
      <Ionicons name={icon as any} size={14} color="#6b7280" />
      <Text style={styles.profileLabel}>{label}</Text>
      <View style={styles.profileValue}>{children}</View>
    </View>
  );
}

async function logout() {
  await AsyncStorage.multiRemove(['session', 'currentFarmer', 'userRole']);
  router.replace('/auth/start');
}

export default function HesabimScreen() {
  const [farmer, setFarmer] = useState<Farmer | null>(null);

  const [cksUrl, setCksUrl] = useState<string | null>(null);
  const [cksUrlLoading, setCksUrlLoading] = useState(true);
  const [cksModalVisible, setCksModalVisible] = useState(false);

  const [cpOld, setCpOld] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpRepeat, setCpRepeat] = useState('');
  const [cpError, setCpError] = useState<string | null>(null);
  const [cpSuccess, setCpSuccess] = useState(false);
  const [cpLoading, setCpLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('currentFarmer').then((raw) => {
      if (!raw) { router.replace('/auth/start'); return; }
      const f: Farmer = JSON.parse(raw);
      setFarmer(f);
      getCKSDocument(f.id)
        .then(({ url }) => setCksUrl(url))
        .catch(() => setCksUrl(null))
        .finally(() => setCksUrlLoading(false));
    });
  }, []);

  async function handleChangePassword() {
    if (!cpOld || !cpNew || !cpRepeat) { setCpError('Tüm alanlar zorunludur.'); return; }
    if (cpNew !== cpRepeat) { setCpError('Yeni şifreler eşleşmiyor.'); return; }
    setCpError(null);
    setCpLoading(true);
    try {
      await authChangePassword(farmer!.phone, 'farmer', cpOld, cpNew);
      setCpSuccess(true);
      setCpOld(''); setCpNew(''); setCpRepeat('');
    } catch (e: any) {
      setCpError(e.message || 'Şifre değiştirilemedi.');
    } finally {
      setCpLoading(false);
    }
  }

  if (!farmer) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  const cksIsPdf = cksUrl?.includes('.pdf');

  return (
    <>
    <Modal visible={cksModalVisible} animationType="slide" onRequestClose={() => setCksModalVisible(false)}>
      <View style={styles.modalContainer}>
        <TouchableOpacity style={styles.modalClose} onPress={() => setCksModalVisible(false)}>
          <Text style={styles.modalCloseText}>✕</Text>
        </TouchableOpacity>
        {cksIsPdf ? (
          <View style={styles.modalPdfNote}>
            <Text style={styles.modalPdfText}>Bu belge PDF formatındadır.</Text>
            <TouchableOpacity
              style={styles.openBtn}
              onPress={() => cksUrl && Linking.openURL(cksUrl)}
            >
              <Text style={styles.openBtnText}>Tarayıcıda Aç</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Image source={{ uri: cksUrl ?? '' }} style={styles.modalImage} resizeMode="contain" />
        )}
      </View>
    </Modal>

    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.infoCard}>
        <Text style={styles.infoName}>{farmer.full_name}</Text>
        <Text style={styles.infoPhone}>{farmer.phone}</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-circle-outline" size={15} color="#6b7280" />
          <Text style={styles.profileTitle}>Profil Bilgileri</Text>
        </View>
        <ProfileRow icon="people-outline" label="Kooperatif Üyeliği">
          <View style={[styles.badge, farmer.cooperative_member ? styles.badgeGreen : styles.badgeGray]}>
            <Text style={[styles.badgeText, farmer.cooperative_member ? styles.badgeTextGreen : styles.badgeTextGray]}>
              {farmer.cooperative_member ? 'Üye' : 'Üye Değil'}
            </Text>
          </View>
        </ProfileRow>
        <ProfileRow icon="calendar-outline" label="Çiftçilik Geçmişi">
          <Text style={styles.profileValueText}>
            {farmer.farming_history_years != null ? `${farmer.farming_history_years} yıl` : '—'}
          </Text>
        </ProfileRow>
        <ProfileRow icon="resize-outline" label="Arazi Büyüklüğü">
          <Text style={styles.profileValueText}>
            {farmer.land_size_ha != null ? `${Number(farmer.land_size_ha).toString()} ha` : '—'}
          </Text>
        </ProfileRow>
        <ProfileRow icon="location-outline" label="Bölge">
          <Text style={styles.profileValueText}>{farmer.region ?? '—'}</Text>
        </ProfileRow>
      </View>

      <View style={styles.pwCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="key-outline" size={15} color="#6b7280" />
          <Text style={styles.pwTitle}>Şifreyi Değiştir</Text>
        </View>
        <TextInput
          style={styles.pwInput}
          value={cpOld}
          onChangeText={v => { setCpOld(v); setCpSuccess(false); setCpError(null); }}
          secureTextEntry
          placeholder="Mevcut şifre"
          placeholderTextColor="#9ca3af"
        />
        <TextInput
          style={styles.pwInput}
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
          style={styles.pwInput}
          value={cpRepeat}
          onChangeText={v => { setCpRepeat(v); setCpError(null); }}
          secureTextEntry
          placeholder="Yeni şifre tekrar"
          placeholderTextColor="#9ca3af"
        />
        {cpError && <Text style={styles.pwError}>{cpError}</Text>}
        {cpSuccess && <Text style={styles.pwSuccess}>Şifre güncellendi.</Text>}
        <TouchableOpacity style={styles.pwBtn} onPress={handleChangePassword} disabled={cpLoading}>
          {cpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.pwBtnText}>Güncelle</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.cksCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-attach-outline" size={15} color="#6b7280" />
          <Text style={styles.cksTitle}>ÇKS Belgesi</Text>
        </View>
        {cksUrlLoading ? (
          <ActivityIndicator color="#6b7280" />
        ) : cksUrl ? (
          <TouchableOpacity style={styles.cksViewBtn} onPress={() => setCksModalVisible(true)}>
            <Ionicons name="document-outline" size={15} color="#fff" />
            <Text style={styles.cksViewBtnText}>Belgemi Gör</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.cksNotFound}>ÇKS belgesi bulunamadı.</Text>
        )}
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  profileCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  profileTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginLeft: 5 },
  profileRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 8,
  },
  profileLabel: { fontSize: 14, color: '#6b7280', flex: 1 },
  profileValue: { alignItems: 'flex-end' },
  profileValueText: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeGray: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 13, fontWeight: '600' },
  badgeTextGreen: { color: '#166534' },
  badgeTextGray: { color: '#6b7280' },
  pwCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  pwTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginLeft: 5 },
  pwInput: {
    backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb',
    padding: 12, fontSize: 15, color: '#1f2937', marginBottom: 12,
  },
  fieldWarn: { color: '#b45309', fontSize: 12, marginTop: -8, marginBottom: 10 },
  pwError: { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  pwSuccess: { color: '#16a34a', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  pwBtn: {
    backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, alignItems: 'center',
  },
  pwBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cksCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cksTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginLeft: 5 },
  cksViewBtn: {
    backgroundColor: '#6b7280', borderRadius: 8, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  cksViewBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cksNotFound: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 8 },
  logoutBtn: {
    backgroundColor: '#fee2e2', borderRadius: 10, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  logoutBtnText: { color: '#dc2626', fontSize: 16, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalClose: {
    position: 'absolute', top: 48, right: 20, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  modalImage: { flex: 1, width: '100%' },
  modalPdfNote: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  modalPdfText: { color: '#9ca3af', fontSize: 16, textAlign: 'center' },
  openBtn: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24,
  },
  openBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
