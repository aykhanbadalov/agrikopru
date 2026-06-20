import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ContractStatusBadge from '../../components/ContractStatusBadge';
import { Contract, getContracts } from '../../services/api';

type StatusFilter = 'all' | 'draft' | 'active' | 'completed' | 'cancelled';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'draft', label: 'Taslak' },
  { key: 'active', label: 'Aktif' },
  { key: 'completed', label: 'Tamamlandı' },
  { key: 'cancelled', label: 'İptal' },
];

export default function PortfolyoScreen() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [buyerName, setBuyerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('buyerName').then((name) => {
      setBuyerName(name);
      if (!name) { setLoading(false); return; }
      getContracts({ buyer_name: name })
        .then(setContracts)
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  if (!buyerName) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>
          Önce Sözleşme Teklifi ekranında alıcı adı girin.
        </Text>
      </View>
    );
  }

  const visible =
    statusFilter === 'all'
      ? contracts
      : contracts.filter((c) => c.status === statusFilter);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, statusFilter === f.key && styles.chipActive]}
            onPress={() => setStatusFilter(f.key)}
          >
            <Text style={[styles.chipText, statusFilter === f.key && styles.chipActiveText]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#16a34a" /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          renderItem={({ item }) => <ContractCard contract={item} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="document-outline" size={48} color="#d1d5db" />
              <Text style={styles.empty}>Sözleşme bulunamadı.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

function ContractCard({ contract: c }: { contract: Contract }) {
  const date = new Date(c.created_at).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.product}>{c.product_type}</Text>
        <ContractStatusBadge status={c.status} />
      </View>
      <Text style={styles.value}>
        {Number(c.total_value_tl).toLocaleString('tr-TR')} TL
      </Text>
      <Text style={styles.date}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { color: '#9ca3af', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  filterRow: { paddingHorizontal: 12, paddingVertical: 10, flexGrow: 0 },
  chip: {
    borderRadius: 20, borderWidth: 1, borderColor: '#d1d5db',
    paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipText: { fontSize: 13, color: '#374151' },
  chipActiveText: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  product: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  value: { fontSize: 15, color: '#166534', fontWeight: '600', marginBottom: 4 },
  date: { fontSize: 12, color: '#9ca3af' },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 8 },
});
