import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FarmerCard from '../../components/FarmerCard';
import { Farmer, getFarmers } from '../../services/api';

export default function AnaPanelScreen() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFarmers(50)
      .then(setFarmers)
      .catch(() => setError('Çiftçiler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = query
    ? farmers.filter((f) =>
        f.full_name.toLowerCase().includes(query.toLowerCase()),
      )
    : farmers;

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Çiftçi ara..."
        value={query}
        onChangeText={setQuery}
        clearButtonMode="while-editing"
      />
      <FlatList
        data={filtered}
        keyExtractor={(f) => f.id}
        renderItem={({ item }) => (
          <FarmerCard
            farmer={item}
            onPress={() =>
              router.navigate({ pathname: '/(tabs)/credit', params: { farmerId: item.id } })
            }
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Sonuç bulunamadı.</Text>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  search: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
  errorText: { color: '#ef4444', fontSize: 15 },
});
