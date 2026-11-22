import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, Switch, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import ApiService from '../../services/ApiService';
import { rupiah } from '../../services/validators';
import { Badge, Card, Empty, FormError, colors, s } from '../../components/ui';

function occupancyTone(rate) {
  if (rate >= 0.8) return 'danger';
  if (rate >= 0.5) return 'warning';
  return 'success';
}

export default function ZonesScreen() {
  const router = useRouter();
  const [zones, setZones] = useState([]);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ApiService.getZones(onlyAvailable);
      setZones(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [onlyAvailable]);

  // Muat ulang tiap kali tab ini dibuka
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={s.content}
      data={zones}
      keyExtractor={(z) => z.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <View style={s.row}>
            <Text style={s.body}>Hanya zona yang masih kosong</Text>
            <Switch value={onlyAvailable} onValueChange={setOnlyAvailable} />
          </View>
          <FormError message={error} />
        </View>
      }
      ListEmptyComponent={!loading ? <Empty text="Belum ada zona yang bisa ditampilkan." /> : null}
      renderItem={({ item }) => (
        <Card onPress={() => router.push(`/zone/${item.id}`)}>
          <View style={s.row}>
            <Text style={[s.h2, { flex: 1 }]}>{item.name}</Text>
            <Badge label={`${Math.round(item.occupancyRate * 100)}% terisi`} tone={occupancyTone(item.occupancyRate)} />
          </View>
          <Text style={s.body}>
            <Text style={{ fontWeight: '700', color: colors.primary }}>{item.freeSlots}</Text> dari {item.totalSlots} slot kosong
          </Text>
          <Text style={s.muted}>Tarif sekarang {rupiah(item.tariffPerHour)}/jam</Text>
        </Card>
      )}
    />
  );
}
