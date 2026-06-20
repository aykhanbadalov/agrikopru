import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { Contract } from '../services/api';

type Props = { status: Contract['status'] };

const STATUS_COLOR: Record<string, string> = {
  draft:     '#9ca3af',
  active:    '#22c55e',
  completed: '#3b82f6',
  cancelled: '#ef4444',
};

const STATUS_LABEL: Record<string, string> = {
  draft:     'TASLAK',
  active:    'AKTİF',
  completed: 'TAMAMLANDI',
  cancelled: 'İPTAL',
};

const STATUS_ICON: Record<string, string> = {
  draft:     'document-outline',
  active:    'checkmark-circle-outline',
  completed: 'checkmark-done-circle',
  cancelled: 'close-circle-outline',
};

export default function ContractStatusBadge({ status }: Props) {
  const color = STATUS_COLOR[status] ?? '#9ca3af';
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Ionicons
        name={STATUS_ICON[status] as any ?? 'ellipse-outline'}
        size={12}
        color="#fff"
        style={styles.icon}
      />
      <Text style={styles.text}>{STATUS_LABEL[status] ?? status.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  icon: { marginRight: 4 },
  text: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
