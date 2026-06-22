import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScoreBadge from '../../../components/ScoreBadge';
import ScoreChart from '../../../components/ScoreChart';
import { ShapBar, FEATURE_LABELS } from '../../../components/ShapBar';
import { Farmer, ScoreHistoryPoint, getScoreHistory, requestScore } from '../../../services/api';

export default function PanelimScreen() {
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([]);
  const [creditInfoVisible, setCreditInfoVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('currentFarmer').then(async (raw) => {
      if (!raw) { router.replace('/farmer/login'); return; }
      const f: Farmer = JSON.parse(raw);
      if (!f.latest_score) {
        try {
          const score = await requestScore(f.id);
          f.latest_score = score;
          await AsyncStorage.setItem('currentFarmer', JSON.stringify(f));
        } catch {}
      }
      setFarmer(f);
      getScoreHistory(f.id).then(setHistory).catch(() => {});
    });
  }, []);

  if (!farmer) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  const s = farmer.latest_score;

  return (
    <>
    <Modal
      visible={creditInfoVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setCreditInfoVisible(false)}
    >
      <View style={styles.infoOverlay}>
        <View style={styles.infoSheet}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoTitle}>Kredi Limiti Nasıl Hesaplanır?</Text>
            <TouchableOpacity style={styles.infoCloseBtn} onPress={() => setCreditInfoVisible(false)}>
              <Text style={styles.infoCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoFormula}>
            (Skor ÷ 1000) × Arazi (ha) × Bölge Katsayısı × 75.000 TL/ha
          </Text>
          <View style={styles.infoCalc}>
            <Text style={styles.infoCalcLine}>
              = ({s?.score} ÷ 1000) × {farmer.land_size_ha != null ? Number(farmer.land_size_ha).toString() : '—'} × 1,0 × 75.000
            </Text>
            <Text style={styles.infoCalcResult}>
              = {s?.credit_limit_tl != null ? `${Number(s.credit_limit_tl).toLocaleString('tr-TR')} TL` : 'Bilgi yok'}
            </Text>
          </View>
          <Text style={styles.infoNote}>
            Bölge Katsayısı: 1,0 (varsayılan — gerçek uygulamada banka ortağı ile kalibre edilecek)
          </Text>
        </View>
      </View>
    </Modal>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.welcome}>Hoş geldiniz,</Text>
      <Text style={styles.name}>{farmer.full_name}</Text>

      {!s ? (
        <View style={styles.noScoreBox}>
          <Text style={styles.noScoreText}>Skor henüz hesaplanmamış.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Kredi Skorunuz</Text>
            <Text style={styles.rowValue}>{s.score} / 1000</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Risk Bandı</Text>
            <ScoreBadge band={s.risk_band} />
          </View>
          <TouchableOpacity style={styles.row} onPress={() => setCreditInfoVisible(true)}>
            <View style={styles.rowLabelWrap}>
              <Text style={styles.rowLabel}>Kredi Limitiniz</Text>
              <Ionicons name="information-circle-outline" size={15} color="#9ca3af" style={{ marginLeft: 4 }} />
            </View>
            <Text style={styles.rowValue}>
              {s.credit_limit_tl
                ? `${Number(s.credit_limit_tl).toLocaleString('tr-TR')} TL`
                : 'Bilgi yok'}
            </Text>
          </TouchableOpacity>

          {s.feature_contributions && (
            <View style={styles.shapSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="analytics-outline" size={15} color="#6b7280" />
                <Text style={styles.sectionTitle}>Skor Faktörleri</Text>
              </View>
              {Object.entries(s.feature_contributions)
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .map(([key, val]) => (
                  <ShapBar key={key} label={FEATURE_LABELS[key] ?? key} value={val} />
                ))}
            </View>
          )}

          {history.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={15} color="#6b7280" />
                <Text style={styles.sectionTitle}>Skor Geçmişi</Text>
              </View>
              <ScoreChart points={history} />
            </View>
          )}

          <View style={styles.syntheticNote}>
            <Text style={styles.syntheticText}>SENTETİK MODEL V1 — Gerçek veri değildir.</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.navigate('/farmer/(tabs)/sozlesmelerim')}
      >
        <Text style={styles.btnText}>Sözleşme Tekliflerini Gör</Text>
      </TouchableOpacity>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcome: { fontSize: 16, color: '#6b7280', marginBottom: 2 },
  name: { fontSize: 24, fontWeight: '800', color: '#1f2937', marginBottom: 20 },
  noScoreBox: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  noScoreText: { color: '#9ca3af', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  rowLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  rowLabelWrap: { flexDirection: 'row', alignItems: 'center' },
  rowValue: { fontSize: 15, color: '#1f2937', fontWeight: '700' },
  infoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  infoSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 36,
  },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  infoTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937', flex: 1, marginRight: 8 },
  infoCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  infoCloseText: { fontSize: 16, color: '#6b7280', fontWeight: '700' },
  infoFormula: { fontSize: 14, color: '#374151', fontWeight: '600', marginBottom: 12, lineHeight: 22 },
  infoCalc: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 12 },
  infoCalcLine: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  infoCalcResult: { fontSize: 15, color: '#166534', fontWeight: '700' },
  infoNote: { fontSize: 12, color: '#9ca3af', lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginLeft: 5 },
  shapSection: { marginTop: 4, marginBottom: 12 },
  historySection: { marginTop: 4, marginBottom: 12 },
  syntheticNote: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 4 },
  syntheticText: { color: '#92400e', fontSize: 13, fontWeight: '600' },
  btn: {
    backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
