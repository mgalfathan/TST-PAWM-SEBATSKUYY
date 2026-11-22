import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { colors } from '../../components/ui';

const icon = (name) => ({ color, size }) => <Ionicons name={name} size={size} color={color} />;

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerTitleStyle: { fontWeight: '700' } }}>
      <Tabs.Screen name="index" options={{ title: 'Cari Parkir', tabBarIcon: icon('car-outline') }} />
      <Tabs.Screen name="activity" options={{ title: 'Aktivitas', tabBarIcon: icon('time-outline') }} />
      <Tabs.Screen name="city" options={{ title: 'Info Kota', tabBarIcon: icon('business-outline') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('person-outline') }} />
    </Tabs>
  );
}
