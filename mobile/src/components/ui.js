import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const colors = {
  primary: '#1D4ED8',
  primarySoft: '#DBEAFE',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  bg: '#F9FAFB',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
};

export function Field({ label, error, ...props }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[s.input, error && { borderColor: colors.danger }]}
        {...props}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

export function Button({ title, onPress, loading, variant = 'primary', disabled }) {
  const outline = variant === 'outline';
  const danger = variant === 'danger';
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        s.btn,
        outline && s.btnOutline,
        danger && { backgroundColor: colors.danger },
        (pressed || disabled) && { opacity: 0.7 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.primary : '#fff'} />
      ) : (
        <Text style={[s.btnText, outline && { color: colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style, onPress }) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={[s.card, style]}>
      {children}
    </Wrap>
  );
}

export function Badge({ label, tone = 'default' }) {
  const map = {
    default: [colors.primarySoft, colors.primary],
    success: ['#DCFCE7', colors.success],
    warning: ['#FEF3C7', colors.warning],
    danger: ['#FEE2E2', colors.danger],
    muted: ['#F3F4F6', colors.muted],
  };
  const [bg, fg] = map[tone] || map.default;
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return <Text style={[s.error, { marginBottom: 12, fontSize: 14 }]}>{message}</Text>;
}

export function Empty({ text }) {
  return <Text style={s.empty}>{text}</Text>;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted },
  h2: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: 4 },
  btn: { backgroundColor: colors.primary, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 24 },
});
