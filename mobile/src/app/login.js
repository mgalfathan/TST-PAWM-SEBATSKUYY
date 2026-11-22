import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { validateLogin } from '../services/validators';
import { Button, Field, FormError, s } from '../components/ui';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const e = validateLogin(form);
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await signIn(form.email, form.password);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 96 }]} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>ParkirIn</Text>
        <Text style={[s.subtitle, { marginBottom: 24 }]}>Cari, pesan, dan bayar parkir di Bandung.</Text>
        <FormError message={formError} />
        <Field
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="driver@parkirin.id"
          error={errors.email}
        />
        <Field
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          secureTextEntry
          placeholder="••••••••"
          error={errors.password}
        />
        <Button title="Masuk" onPress={submit} loading={loading} />
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Link href="/register" style={{ color: '#1D4ED8', fontWeight: '600' }}>
            Belum punya akun? Daftar
          </Link>
        </View>
        <Text style={[s.muted, { textAlign: 'center', marginTop: 24 }]}>
          Akun demo: driver@parkirin.id / parkirin123
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
