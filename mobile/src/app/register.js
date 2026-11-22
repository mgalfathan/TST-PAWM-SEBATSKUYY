import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { normalizePlate, validateRegister } from '../services/validators';
import { Button, Field, FormError, s } from '../components/ui';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', plateNumber: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const e = validateRegister(form);
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await signUp({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(form.plateNumber ? { plateNumber: normalizePlate(form.plateNumber) } : {}),
      });
    } catch (err) {
      // Tampilkan error validasi dari server per field kalau ada
      if (err.details) setErrors(err.details);
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <FormError message={formError} />
        <Field label="Nama lengkap" value={form.name} onChangeText={set('name')} error={errors.name} />
        <Field
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
        />
        <Field label="Password (min. 8 karakter)" value={form.password} onChangeText={set('password')} secureTextEntry error={errors.password} />
        <Field label="Ulangi password" value={form.confirm} onChangeText={set('confirm')} secureTextEntry error={errors.confirm} />
        <Field
          label="Plat nomor kendaraan (opsional)"
          value={form.plateNumber}
          onChangeText={set('plateNumber')}
          autoCapitalize="characters"
          placeholder="D 1234 ABC"
          error={errors.plateNumber}
        />
        <Button title="Daftar" onPress={submit} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
