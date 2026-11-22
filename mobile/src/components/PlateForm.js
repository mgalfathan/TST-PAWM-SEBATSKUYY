// Form plat nomor dipakai di layar Reservasi dan Check-in.
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { normalizePlate, validatePlate } from '../services/validators';
import { Button, Card, Field, FormError, colors, s } from './ui';

export default function PlateForm({ zoneName, intro, submitLabel, onSubmit }) {
  const { user } = useAuth();
  const vehicles = user?.vehicles || [];
  const [plate, setPlate] = useState(vehicles[0] || '');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    const e = validatePlate(plate);
    setError(e || '');
    setFormError('');
    if (e) return;
    setLoading(true);
    try {
      await onSubmit(normalizePlate(plate));
    } catch (err) {
      if (err.details?.plateNumber) setError(err.details.plateNumber);
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Card>
        <Text style={s.muted}>Zona</Text>
        <Text style={s.h2}>{zoneName}</Text>
        <Text style={s.muted}>{intro}</Text>
      </Card>
      <FormError message={formError} />
      <Field
        label="Plat nomor kendaraan"
        value={plate}
        onChangeText={setPlate}
        autoCapitalize="characters"
        placeholder="D 1234 ABC"
        error={error}
      />
      {vehicles.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: -4, marginBottom: 8 }}>
          {vehicles.map((v) => (
            <Pressable key={v} onPress={() => setPlate(v)} style={[s.badge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[s.badgeText, { color: colors.primary }]}>{v}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Button title={submitLabel} onPress={submit} loading={loading} />
    </ScrollView>
  );
}
