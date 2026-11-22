import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { colors } from '../components/ui';

function RootStack() {
  const { isSignedIn, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerTintColor: colors.primary, headerBackTitle: 'Kembali' }}>
      {/* Layar setelah login */}
      <Stack.Protected guard={isSignedIn} redirectTo="/login">
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="zone/[id]" options={{ title: 'Detail Zona' }} />
        <Stack.Screen name="reserve" options={{ title: 'Reservasi Slot' }} />
        <Stack.Screen name="checkin" options={{ title: 'Check-in Parkir' }} />
      </Stack.Protected>
      {/* Layar sebelum login */}
      <Stack.Protected guard={!isSignedIn} redirectTo="/">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Daftar Akun' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootStack />
    </AuthProvider>
  );
}
