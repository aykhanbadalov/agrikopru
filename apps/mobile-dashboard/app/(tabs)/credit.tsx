import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScoreBadge from '../../components/ScoreBadge';
import { Farmer, getFarmer } from '../../services/api';

const FEATURE_LABELS: Record<string, string> = {
  land_size_ha:          'Arazi Büyüklüğü',
  farming_history_years: 'Çiftçilik Geçmişi',
  cooperative_member:    'Kooperatif Üyeliği',
  tarsim_history_score:  'Sigorta Geçmişi',
  fertilizer_purchases:  'Gübre Alımı',
  climate_risk_score:    'İklim Riski',
};

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

  useEffect(() => {
    if (!farmerId) return;
    setLoading(true);
    getFarmer(farmerId)
      .then(setFarmer)
      .catch(() => setError('Çiftçi yüklenemedi.'))
      .finally(() => setLoading(false));
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
  shapSection: { marginTop: 8, marginBottom: 12 },
  shapTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
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
