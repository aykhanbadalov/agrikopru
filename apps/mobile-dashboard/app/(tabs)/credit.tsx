import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScoreBadge from '../../components/ScoreBadge';
import { Farmer, getFarmer } from '../../services/api';

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
  syntheticNote: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 4 },
  syntheticText: { color: '#92400e', fontSize: 13, fontWeight: '600' },
  btn: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
