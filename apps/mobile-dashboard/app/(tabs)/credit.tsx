import { router, useLocalSearchParams } from 'expo-router';
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
import { Ionicons } from '@expo/vector-icons';
import ScoreBadge from '../../components/ScoreBadge';
import ScoreChart from '../../components/ScoreChart';
import { ShapBar, FEATURE_LABELS } from '../../components/ShapBar';
import { Farmer, ScoreHistoryPoint, getFarmer, getScoreHistory } from '../../services/api';

export default function KrediAnaliziScreen() {
  const { farmerId } = useLocalSearchParams<{ farmerId?: string }>();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([]);
  const [creditInfoVisible, setCreditInfoVisible] = useState(false);

  useEffect(() => {
    if (!farmerId) return;
    setLoading(true);
    getFarmer(farmerId)
      .then(setFarmer)
      .catch(() => setError('Çiftçi yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [farmerId]);

  useEffect(() => {
    if (!farmerId) return;
    getScoreHistory(farmerId).then(setHistory).catch(() => {});
  }, [farmerId]);

  if (!farmerId) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>Ana Panel'den bir çiftçi seçin.</Text>
      </View>
    );
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  if (!farmer) return null;

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
      <Text style={styles.name}>{farmer.full_name}</Text>

      {!s ? (
        <Text style={styles.noScore}>Skor henüz hesaplanmamış.</Text>
      ) : (
        <View style={styles.card}>
          <Row label="Kredi Skoru" value={`${s.score} / 1000`} />
          <View style={styles.rowWrap}>
            <Text style={styles.rowLabel}>Risk Bandı</Text>
            <ScoreBadge band={s.risk_band} />
          </View>
          <TouchableOpacity style={styles.row} onPress={() => setCreditInfoVisible(true)}>
            <View style={styles.rowLabelWrap}>
              <Text style={styles.rowLabel}>Kredi Limiti</Text>
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
                <Text style={styles.shapTitle}>Skor Faktörleri</Text>
              </View>
              {Object.entries(s.feature_contributions)
                .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                .map(([key, val]) => (
                  <ShapBar
                    key={key}
                    label={FEATURE_LABELS[key] ?? key}
                    value={val}
                  />
                ))}
            </View>
          )}

          {history.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={15} color="#6b7280" />
                <Text style={styles.historyTitle}>Skor Geçmişi</Text>
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
        onPress={() =>
          router.navigate({ pathname: '/(tabs)/contract', params: { farmerId: farmer.id } })
        }
      >
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={styles.btnText}>Sözleşme Oluştur</Text>
      </TouchableOpacity>
    </ScrollView>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { color: '#9ca3af', fontSize: 16, textAlign: 'center' },
  errorText: { color: '#ef4444' },
  name: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 16 },
  noScore: { color: '#9ca3af', fontSize: 16, marginBottom: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  rowWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  rowLabel: { fontSize: 15, color: '#374151', fontWeight: '500' },
  rowLabelWrap: { flexDirection: 'row', alignItems: 'center' },
  rowValue: { fontSize: 15, color: '#1f2937', fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  shapSection: { marginTop: 8, marginBottom: 12 },
  shapTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginLeft: 5 },
  historySection: { marginTop: 8, marginBottom: 12 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginLeft: 5 },
  syntheticNote: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 4 },
  syntheticText: { color: '#92400e', fontSize: 13, fontWeight: '600' },
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
  btn: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
