import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Contract } from '../services/api';

type Props = { status: Contract['status'] };

const STATUS_COLOR: Record<string, string> = {
  draft: '#9ca3af',
  active: '#22c55e',
  completed: '#3b82f6',
  cancelled: '#ef4444',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'TASLAK',
  active: 'AKTİF',
  completed: 'TAMAMLANDI',
  cancelled: 'İPTAL',
};

export default function ContractStatusBadge({ status }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLOR[status] ?? '#9ca3af' }]}>
      <Text style={styles.text}>{STATUS_LABEL[status] ?? status.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
