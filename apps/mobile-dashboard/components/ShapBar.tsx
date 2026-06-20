import { StyleSheet, Text, View } from 'react-native';

export const FEATURE_LABELS: Record<string, string> = {
  land_size_ha:          'Arazi Büyüklüğü',
  farming_history_years: 'Çiftçilik Geçmişi',
  cooperative_member:    'Kooperatif Üyeliği',
  tarsim_history_score:  'Sigorta Geçmişi',
  fertilizer_purchases:  'Gübre Alımı',
  climate_risk_score:    'İklim Riski',
};

export function ShapBar({ label, value }: { label: string; value: number }) {
  const pct = Math.abs(value);
  const positive = value >= 0;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(pct * 100)}%` },
            positive ? styles.pos : styles.neg,
          ]}
        />
      </View>
      <Text style={[styles.val, positive ? styles.posText : styles.negText]}>
        {positive ? '+' : ''}{value.toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
