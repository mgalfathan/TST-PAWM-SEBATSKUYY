// Integrasi: data ParkirIn publik (OHS) + API dua kelompok lain lewat ApiService.
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import ApiService from '../../services/ApiService';
import { rupiah } from '../../services/validators';
import { Badge, Card, s } from '../../components/ui';

// Titik acuan: Kampus ITB Ganesha
const ITB = { lat: -6.8932, lng: 107.6106 };

// Data kelompok lain belum tentu formatnya sama, jadi diringkas secara generik.
function summarize(payload) {
  const list = Array.isArray(payload) ? payload : payload?.data ?? payload?.items ?? payload?.results;
  if (Array.isArray(list)) {
    return list.slice(0, 5).map((item, i) => {
      if (typeof item !== 'object' || item === null) return String(item);
      const title = item.name || item.nama || item.title || item.judul || item.id || `Item ${i + 1}`;
      const extra = Object.entries(item)
        .filter(([k, v]) => !['name', 'nama', 'title', 'judul', 'id'].includes(k) && typeof v !== 'object')
        .slice(0, 2)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
      return extra ? `${title} (${extra})` : String(title);
    });
  }
  if (payload && typeof payload === 'object') {
    return Object.entries(payload)
      .filter(([, v]) => typeof v !== 'object')
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${v}`);
  }
  return [String(payload)];
}

export default function CityScreen() {
  const [nearby, setNearby] = useState({ status: 'loading' });
  const [partners, setPartners] = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const tasks = [
      ApiService.publicAvailability(ITB.lat, ITB.lng, 2)
        .then((res) => setNearby({ status: 'ok', data: res.data }))
        .catch((e) => setNearby({ status: 'error', message: e.message })),
      ...ApiService.partners.map((p) =>
        ApiService.getPartner(p.key)
          .then((res) => setPartners((prev) => ({ ...prev, [p.key]: { status: 'ok', lines: summarize(res) } })))
          .catch((e) => setPartners((prev) => ({ ...prev, [p.key]: { status: 'error', message: e.message } }))),
      ),
    ];
    await Promise.allSettled(tasks);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Card>
        <View style={s.row}>
          <Text style={s.h2}>Parkir dekat ITB (radius 2 km)</Text>
          <Badge label="ParkirIn" />
        </View>
        {nearby.status === 'error' && <Text style={s.muted}>{nearby.message}</Text>}
        {nearby.status === 'ok' &&
          nearby.data.map((z) => (
            <Text key={z.zoneId} style={s.body}>
              {z.name}: {z.freeSlots} kosong, {z.distanceKm} km, {rupiah(z.tariffPerHour)}/jam
            </Text>
          ))}
      </Card>

      {ApiService.partners.map((p) => {
        const st = partners[p.key];
        return (
          <Card key={p.key}>
            <View style={s.row}>
              <Text style={[s.h2, { flex: 1 }]}>{p.name}</Text>
              <Badge label={!st ? 'memuat' : st.status === 'ok' ? 'online' : 'offline'} tone={!st ? 'muted' : st.status === 'ok' ? 'success' : 'danger'} />
            </View>
            <Text style={s.muted}>{p.baseUrl}{p.path}</Text>
            {st?.status === 'ok' && st.lines.map((line, i) => <Text key={i} style={s.body}>• {line}</Text>)}
            {st?.status === 'error' && <Text style={s.muted}>Gagal memuat: {st.message}</Text>}
          </Card>
        );
      })}
    </ScrollView>
  );
}
