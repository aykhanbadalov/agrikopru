import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Circle, Line, Polyline, Svg, Text as SvgText } from 'react-native-svg';
import ScoreBadge from '../../components/ScoreBadge';
import { CKSExtractResult, Farmer, ScoreHistoryPoint, extractCKS, getFarmer, getScoreHistory } from '../../services/api';

const FEATURE_LABELS: Record<string, string> = {
  land_size_ha:          'Arazi Büyüklüğü',
  farming_history_years: 'Çiftçilik Geçmişi',
  cooperative_member:    'Kooperatif Üyeliği',
  tarsim_history_score:  'Sigorta Geçmişi',
  fertilizer_purchases:  'Gübre Alımı',
  climate_risk_score:    'İklim Riski',
};

const BAND_COLOR: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#ef4444',
};

const CHART_H = 120;
const PAD = { top: 10, bottom: 28, left: 24, right: 24 };

function ScoreChart({ points }: { points: ScoreHistoryPoint[] }) {
  if (points.length < 2) {
    return <Text style={styles.noHistory}>Henüz yeterli geçmiş yok.</Text>;
  }

  const W = Dimensions.get('window').width - 64;
  const xStep = (W - PAD.left - PAD.right) / (points.length - 1);
  const yRange = CHART_H - PAD.top - PAD.bottom;

  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (score: number) => PAD.top + yRange * (1 - score / 1000);

  const polyPoints = points.map((p, i) => `${toX(i)},${toY(p.score)}`).join(' ');

  return (
    <Svg width={W} height={CHART_H}>
      {[0, 500, 1000].map((v) => (
        <Line
          key={v}
          x1={PAD.left} y1={toY(v)}
          x2={W - PAD.right} y2={toY(v)}
          stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4,3"
        />
      ))}
      <Polyline points={polyPoints} fill="none" stroke="#6b7280" strokeWidth={1.5} />
      {points.map((p, i) => (
        <Circle
          key={i}
          cx={toX(i)} cy={toY(p.score)} r={5}
          fill={BAND_COLOR[p.risk_band] ?? '#9ca3af'}
        />
      ))}
      {points.map((p, i) => {
        const d = new Date(p.created_at);
        const label = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
        return (
          <SvgText
            key={i}
            x={toX(i)} y={CHART_H - 4}
            fontSize={9} fill="#9ca3af" textAnchor="middle"
          >{label}</SvgText>
        );
      })}
    </Svg>
  );
}

function ShapBar({ label, value }: { label: string; value: number }) {
  const pct = Math.abs(value);
  const positive = value >= 0;
  return (
    <View style={shap.row}>
      <Text style={shap.label}>{label}</Text>
      <View style={shap.track}>
        <View
          style={[
            shap.fill,
            { width: `${Math.round(pct * 100)}%` },
            positive ? shap.pos : shap.neg,
          ]}
        />
      </View>
      <Text style={[shap.val, positive ? shap.posText : shap.negText]}>
        {positive ? '+' : ''}{value.toFixed(2)}
      </Text>
    </View>
  );
}

export default function KrediAnaliziScreen() {
  const { farmerId } = useLocalSearchParams<{ farmerId?: string }>();
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([]);
  const [cksResult, setCksResult] = useState<CKSExtractResult | null>(null);
  const [cksLoading, setCksLoading] = useState(false);
  const [cksImageUri, setCksImageUri] = useState<string | null>(null);
  const [cksModalVisible, setCksModalVisible] = useState(false);

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
          <Row
            label="Kredi Limiti"
            value={
              s.credit_limit_tl
                ? `${Number(s.credit_limit_tl).toLocaleString('tr-TR')} TL`
                : 'Bilgi yok'
            }
          />

          {/* ÇKS Yükləmə */}
          <View style={styles.cksSection}>
            <TouchableOpacity style={styles.cksBtn} onPress={handleCKSUpload} disabled={cksLoading}>
              {cksLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.cksBtnText}>ÇKS Belgesi Yükle</Text>
              }
            </TouchableOpacity>
            {cksResult && (
              <View style={{ marginTop: 8 }}>
                {cksResult.land_size_ha !== null
                  ? <Text style={styles.cksHa}>OCR Arazi: {cksResult.land_size_ha.toFixed(4)} ha</Text>
                  : <Text style={styles.cksWarn}>Arazi büyüklüğü okunamadı.</Text>
                }
                {cksResult.confidence < 0.6 && (
                  <Text style={styles.cksWarn}>⚠ Sənəd aydın deyil, el ile kontrol edin.</Text>
                )}
                {cksResult.warning && (
                  <Text style={styles.cksWarn}>{cksResult.warning}</Text>
                )}
                {cksImageUri && (
                  <TouchableOpacity style={styles.viewBtn} onPress={() => setCksModalVisible(true)}>
                    <Text style={styles.viewBtnText}>Belgemi Gör</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {s.feature_contributions && (
            <View style={styles.shapSection}>
              <Text style={styles.shapTitle}>Skor Faktörleri</Text>
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
              <Text style={styles.historyTitle}>Skor Geçmişi</Text>
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
  rowValue: { fontSize: 15, color: '#1f2937', fontWeight: '700' },
  cksSection: { marginTop: 4, marginBottom: 12 },
  cksBtn: {
    backgroundColor: '#0ea5e9', borderRadius: 8, paddingVertical: 8, alignItems: 'center',
  },
  cksBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cksHa: { fontSize: 14, fontWeight: '700', color: '#166534' },
  cksWarn: { fontSize: 12, color: '#b45309', marginTop: 2 },
  viewBtn: {
    marginTop: 8, backgroundColor: '#6b7280', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  viewBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
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
  shapSection: { marginTop: 8, marginBottom: 12 },
  shapTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  historySection: { marginTop: 8, marginBottom: 12 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  noHistory: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  syntheticNote: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 4 },
  syntheticText: { color: '#92400e', fontSize: 13, fontWeight: '600' },
  btn: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const shap = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 12, color: '#374151', width: 110 },
  track: {
    flex: 1, height: 10, backgroundColor: '#e5e7eb',
    borderRadius: 5, marginHorizontal: 8, overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 5 },
  pos: { backgroundColor: '#22c55e' },
  neg: { backgroundColor: '#ef4444' },
  val: { fontSize: 12, fontWeight: '700', width: 40, textAlign: 'right' },
  posText: { color: '#16a34a' },
  negText: { color: '#ef4444' },
});
