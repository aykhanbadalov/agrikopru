import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ContractStatusBadge from '../../components/ContractStatusBadge';
import { Contract, getContracts } from '../../services/api';

export default function FarmerContractsScreen() {
  const { farmerId } = useLocalSearchParams<{ farmerId: string }>();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    getContracts({ farmer_id: farmerId })
      .then(setContracts)
      .catch(() => setError('Sözleşmeler yüklenemedi.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#16a34a" size="large" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <FlatList
      data={contracts}
      keyExtractor={(c) => c.id}
      style={styles.list}
      contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.buyer}>{item.buyer_name}</Text>
            <ContractStatusBadge status={item.status} />
          </View>
          <Text style={styles.product}>{item.product_type}</Text>
          <Text style={styles.value}>
            {Number(item.total_value_tl).toLocaleString('tr-TR')} TL
          </Text>
          {item.status === 'draft' && (
            <TouchableOpacity
              style={styles.btn}
              onPress={() =>
                router.navigate({
                  pathname: '/farmer/confirm',
                  params: { contractJson: JSON.stringify(item), farmerId },
                })
              }
            >
              <Text style={styles.btnText}>Onayla</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.empty}>Henüz sözleşme yok.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: '#ef4444' },
  empty: { color: '#9ca3af', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  buyer: { fontSize: 16, fontWeight: '700', color: '#1f2937', flex: 1, marginRight: 8 },
  product: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
  value: { fontSize: 15, color: '#166534', fontWeight: '600', marginBottom: 12 },
  btn: {
    backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
