import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import ApiService from '../../services/ApiService';
import { rupiah } from '../../services/validators';
import { Badge, Button, Card, FormError, colors, s } from '../../components/ui';

const slotTone = { free: 'success', reserved: 'warning', occupied: 'danger' };
const slotLabel = { free: 'Kosong', reserved: 'Dipesan', occupied: 'Terisi' };

export default function ZoneDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [zone, setZone] = useState(null);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      ApiService.getZone(id)
        .then(setZone)
        .catch((e) => setError(e.message));
    }, [id]),
  );

  if (!zone) {
    return (
      <View style={[s.screen, s.content]}>
        {error ? <FormError message={error} /> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const t = zone.tariff;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Stack.Screen options={{ title: zone.name }} />
      <Card>
        <Text style={s.h2}>Ketersediaan</Text>
        <Text style={s.body}>
          {zone.freeSlots} dari {zone.totalSlots} slot kosong ({Math.round(zone.occupancyRate * 100)}% terisi)
        </Text>
      </Card>
      <Card>
        <Text style={s.h2}>Tarif dinamis</Text>
        <Text style={[s.title, { color: colors.primary }]}>{rupiah(t.perHour)}/jam</Text>
        <Text style={s.muted}>
          Tarif dasar {rupiah(t.baseTariff)} x {t.multiplier}
          {t.peakHour ? ' (jam sibuk)' : ''}. Batas regulasi {rupiah(t.bounds.min)} sampai {rupiah(t.bounds.max)}.
        </Text>
      </Card>
      <View style={{ gap: 8 }}>
        <Button
          title="Reservasi slot (tahan 15 menit)"
          disabled={zone.freeSlots === 0}
          onPress={() => router.push({ pathname: '/reserve', params: { zoneId: zone.id, zoneName: zone.name } })}
        />
        <Button
          title="Saya sudah di lokasi, check-in"
          variant="outline"
          onPress={() => router.push({ pathname: '/checkin', params: { zoneId: zone.id, zoneName: zone.name } })}
        />
      </View>
      <Text style={[s.h2, { marginTop: 8 }]}>Status slot</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {zone.slots.map((slot) => (
          <View key={slot.id} style={[s.card, { width: '30%', alignItems: 'center', padding: 10 }]}>
            <Text style={[s.body, { fontWeight: '600' }]}>{slot.code}</Text>
            <Badge label={slotLabel[slot.status]} tone={slotTone[slot.status]} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
