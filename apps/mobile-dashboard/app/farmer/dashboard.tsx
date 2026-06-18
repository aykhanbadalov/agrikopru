import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import ScoreBadge from '../../components/ScoreBadge';
import { Farmer } from '../../services/api';

export default function FarmerDashboardScreen() {
  const { farmerJson } = useLocalSearchParams<{ farmerJson: string }>();
  const farmer: Farmer = JSON.parse(farmerJson);
  const s = farmer.latest_score;

  return (
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
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Kredi Limitiniz</Text>
            <Text style={styles.rowValue}>
              {s.credit_limit_tl
                ? `${Number(s.credit_limit_tl).toLocaleString('tr-TR')} TL`
                : 'Bilgi yok'}
            </Text>
          </View>
          <View style={styles.syntheticNote}>
            <Text style={styles.syntheticText}>SENTETİK MODEL V1 — Gerçek veri değildir.</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.btn}
        onPress={() =>
          router.navigate({
            pathname: '/farmer/contracts',
            params: { farmerId: farmer.id },
          })
        }
      >
        <Text style={styles.btnText}>Sözleşme Tekliflerini Gör</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
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
  rowValue: { fontSize: 15, color: '#1f2937', fontWeight: '700' },
  syntheticNote: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 4 },
  syntheticText: { color: '#92400e', fontSize: 13, fontWeight: '600' },
  btn: {
    backgroundColor: '#16a34a', borderRadius: 10, paddingVertical: 14, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
