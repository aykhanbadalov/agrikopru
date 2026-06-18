import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Farmer } from '../services/api';
import ScoreBadge from './ScoreBadge';

type Props = {
  farmer: Farmer;
  onPress: () => void;
};

export default function FarmerCard({ farmer, onPress }: Props) {
  const s = farmer.latest_score;
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{farmer.full_name}</Text>
          <Text style={styles.phone}>{farmer.phone}</Text>
          {farmer.cooperative_member && (
            <Text style={styles.coop}>Kooperatif Üyesi</Text>
          )}
        </View>
        {s && <ScoreBadge band={s.risk_band} score={s.score} />}
      </View>
      <TouchableOpacity style={styles.btn} onPress={onPress}>
        <Text style={styles.btnText}>Kredi Analizi</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  name: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  phone: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  coop: { fontSize: 12, color: '#16a34a', marginTop: 2 },
  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 7,
    paddingVertical: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
