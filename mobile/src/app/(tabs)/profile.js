import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import ApiService from '../../services/ApiService';
import { normalizePlate, validatePlate } from '../../services/validators';
import { API_BASE_URL } from '../../config';
import { Badge, Button, Card, Field, s } from '../../components/ui';

const roleLabel = { driver: 'Pengendara', officer: 'Petugas Dishub', admin: 'Admin Kota' };

export default function ProfileScreen() {
  const { user, signOut, refreshUser } = useAuth();
  const [plate, setPlate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function addVehicle() {
    const e = validatePlate(plate);
    setError(e || '');
    if (e) return;
    setLoading(true);
    try {
      await ApiService.addVehicle(normalizePlate(plate));
      await refreshUser();
      setPlate('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={s.title}>{user?.name}</Text>
        <Text style={s.subtitle}>{user?.email}</Text>
        <Badge label={roleLabel[user?.role] || user?.role} />
      </Card>
      <Card>
        <Text style={s.h2}>Kendaraan terdaftar</Text>
        {(user?.vehicles || []).length === 0 && <Text style={s.muted}>Belum ada kendaraan.</Text>}
        {(user?.vehicles || []).map((v) => (
          <Text key={v} style={s.body}>• {v}</Text>
        ))}
      </Card>
      <Field label="Tambah plat nomor" value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="D 1234 ABC" error={error} />
      <Button title="Simpan kendaraan" variant="outline" onPress={addVehicle} loading={loading} />
      <Text style={[s.muted, { marginTop: 16 }]}>Server: {API_BASE_URL}</Text>
      <Button title="Keluar" variant="danger" onPress={signOut} />
    </ScrollView>
  );
}
