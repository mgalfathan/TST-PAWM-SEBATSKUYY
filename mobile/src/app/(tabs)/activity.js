import { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ApiService from '../../services/ApiService';
import { rupiah } from '../../services/validators';
import { Badge, Button, Card, Empty, FormError, s } from '../../components/ui';

const tone = { active: 'default', used: 'success', paid: 'success', ended: 'warning', cancelled: 'muted', expired: 'muted' };
const label = { active: 'Aktif', used: 'Dipakai', paid: 'Lunas', ended: 'Belum bayar', cancelled: 'Dibatalkan', expired: 'Kedaluwarsa' };
const time = (iso) => (iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-');

export default function ActivityScreen() {
  const [reservations, setReservations] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [r, sess] = await Promise.all([ApiService.myReservations(), ApiService.mySessions()]);
      setReservations(r.data);
      setSessions(sess.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function run(id, fn) {
    setBusy(id);
    try {
      await fn();
      await load();
    } catch (e) {
      Alert.alert('Gagal', e.message);
    } finally {
      setBusy(null);
    }
  }

  const pay = (session) =>
    Alert.alert('Pilih metode bayar', `Total ${rupiah(session.amount)}`, [
      { text: 'QRIS', onPress: () => run(session.id, () => ApiService.paySession(session.id, 'qris')) },
      { text: 'E-wallet', onPress: () => run(session.id, () => ApiService.paySession(session.id, 'ewallet')) },
      { text: 'Batal', style: 'cancel' },
    ]);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <FormError message={error} />
      <Text style={s.h2}>Sesi parkir</Text>
      {sessions.length === 0 && <Empty text="Belum ada sesi parkir." />}
      {sessions.map((x) => (
        <Card key={x.id}>
          <View style={s.row}>
            <Text style={s.h2}>{x.plateNumber}</Text>
            <Badge label={label[x.status]} tone={tone[x.status]} />
          </View>
          <Text style={s.body}>Slot {x.slotCode} · {rupiah(x.tariffPerHour)}/jam</Text>
          <Text style={s.muted}>Mulai {time(x.startedAt)}{x.endedAt ? ` · selesai ${time(x.endedAt)}` : ''}</Text>
          {x.amount != null && <Text style={s.body}>Durasi {x.durationMinutes} menit · Total {rupiah(x.amount)}</Text>}
          {x.status === 'active' && (
            <Button title="Akhiri parkir" variant="outline" loading={busy === x.id} onPress={() => run(x.id, () => ApiService.endSession(x.id))} />
          )}
          {x.status === 'ended' && <Button title="Bayar" loading={busy === x.id} onPress={() => pay(x)} />}
        </Card>
      ))}

      <Text style={[s.h2, { marginTop: 8 }]}>Reservasi</Text>
      {reservations.length === 0 && <Empty text="Belum ada reservasi." />}
      {reservations.map((r) => (
        <Card key={r.id}>
          <View style={s.row}>
            <Text style={s.h2}>{r.plateNumber}</Text>
            <Badge label={label[r.status]} tone={tone[r.status]} />
          </View>
          <Text style={s.body}>Slot {r.slotCode} · {rupiah(r.tariffPerHour)}/jam</Text>
          <Text style={s.muted}>Berlaku sampai {time(r.expiresAt)}</Text>
          {r.status === 'active' && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Button title="Check-in" loading={busy === r.id} onPress={() => run(r.id, () => ApiService.startSession(r.zoneId, r.plateNumber))} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Batalkan" variant="danger" onPress={() => run(r.id, () => ApiService.cancelReservation(r.id))} />
              </View>
            </View>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}
