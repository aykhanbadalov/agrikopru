import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ContractStatusBadge from '../../../components/ContractStatusBadge';
import { Contract, getContracts } from '../../../services/api';

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default function SozlesmelerimScreen() {
  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('currentFarmer').then((raw) => {
      if (!raw) { router.replace('/farmer/login'); return; }
      setFarmerId(JSON.parse(raw).id);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!farmerId) return;
      setLoading(true);
      getContracts({ farmer_id: farmerId })
        .then(setContracts)
        .catch(() => setError('Sözleşmeler yüklenemedi.'))
        .finally(() => setLoading(false));
    }, [farmerId])
  );

  function handleConfirm(contract: Contract) {
    setSelectedContract(null);
    router.navigate({
      pathname: '/farmer/confirm',
      params: { contractJson: JSON.stringify(contract), farmerId },
    });
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#16a34a" size="large" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.error}>{error}</Text></View>;

  return (
    <>
      <Modal
        visible={selectedContract !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedContract(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sözleşme Detayı</Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedContract(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedContract && (
              <>
                <Row label="Alıcı" value={selectedContract.buyer_name} />
                <Row label="Ürün" value={selectedContract.product_type} />
                <Row label="Miktar" value={`${Number(selectedContract.quantity_kg).toString()} kg`} />
                <Row label="Birim Fiyat" value={`${Number(selectedContract.price_per_kg).toString()} TL/kg`} />
                <Row
                  label="Toplam Değer"
                  value={`${Number(selectedContract.total_value_tl).toLocaleString('tr-TR')} TL`}
                  highlight
                />
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Durum</Text>
                  <ContractStatusBadge status={selectedContract.status} />
                </View>
                <Row label="Oluşturulma Tarihi" value={formatDate(selectedContract.created_at)} />
                <Row
                  label="Onay Tarihi"
                  value={selectedContract.signed_at ? formatDate(selectedContract.signed_at) : '—'}
                />

                {selectedContract.status === 'draft' && (
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={() => handleConfirm(selectedContract)}
                  >
                    <Ionicons name="checkmark-outline" size={16} color="#fff" />
                    <Text style={styles.confirmBtnText}>Onayla</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      <FlatList
        data={contracts}
        keyExtractor={(c) => c.id}
        style={styles.list}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedContract(item)}
            activeOpacity={0.85}
          >
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
                onPress={() => handleConfirm(item)}
              >
                <Ionicons name="checkmark-outline" size={16} color="#fff" />
                <Text style={styles.btnText}>Onayla</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="document-outline" size={48} color="#d1d5db" />
            <Text style={styles.empty}>Henüz sözleşme yok.</Text>
          </View>
        }
      />
    </>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.modalRow}>
      <Text style={styles.modalLabel}>{label}</Text>
      <Text style={[styles.modalValue, highlight && styles.modalValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  error: { color: '#ef4444' },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  buyer: { fontSize: 16, fontWeight: '700', color: '#1f2937', flex: 1, marginRight: 8 },
  product: { fontSize: 14, color: '#6b7280', marginBottom: 6 },
  value: { fontSize: 15, color: '#166534', fontWeight: '600', marginBottom: 12 },
  btn: {
    backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 8, fontSize: 15 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20, paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1f2937' },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  modalCloseText: { fontSize: 16, color: '#6b7280', fontWeight: '700' },
  modalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalLabel: { fontSize: 14, color: '#6b7280' },
  modalValue: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  modalValueHighlight: { color: '#166534', fontSize: 15 },
  confirmBtn: {
    marginTop: 20, backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
