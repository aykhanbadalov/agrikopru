import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = { band: 'LOW' | 'MEDIUM' | 'HIGH'; score?: number };

const BAND_COLOR: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#eab308',
  HIGH: '#ef4444',
};

const BAND_LABEL: Record<string, string> = {
  LOW: 'DÜŞÜK',
  MEDIUM: 'ORTA',
  HIGH: 'YÜKSEK',
};

export default function ScoreBadge({ band, score }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: BAND_COLOR[band] ?? '#9ca3af' }]}>
      <Text style={styles.text}>
        {score !== undefined ? `${score} · ` : ''}
        {BAND_LABEL[band] ?? band}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
