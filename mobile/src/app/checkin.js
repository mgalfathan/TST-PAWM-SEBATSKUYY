import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ApiService from '../services/ApiService';
import { rupiah } from '../services/validators';
import PlateForm from '../components/PlateForm';

// Di dunia nyata check-in dipicu kamera ANPR. Di app, pengendara bisa memicunya manual.
export default function CheckinScreen() {
  const { zoneId, zoneName } = useLocalSearchParams();
  const router = useRouter();

  async function checkin(plate) {
    const { session } = await ApiService.startSession(zoneId, plate);
    Alert.alert('Sesi parkir dimulai', `Slot ${session.slotCode}, tarif ${rupiah(session.tariffPerHour)}/jam.`);
    router.replace('/activity');
  }

  return (
    <PlateForm
      zoneName={zoneName}
      intro="Kalau plat ini punya reservasi aktif di zona ini, slot reservasi yang dipakai."
      submitLabel="Mulai sesi parkir"
      onSubmit={checkin}
    />
  );
}
