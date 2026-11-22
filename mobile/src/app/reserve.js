import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ApiService from '../services/ApiService';
import PlateForm from '../components/PlateForm';

export default function ReserveScreen() {
  const { zoneId, zoneName } = useLocalSearchParams();
  const router = useRouter();

  async function reserve(plate) {
    const { reservation } = await ApiService.createReservation(zoneId, plate);
    const until = new Date(reservation.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    Alert.alert('Reservasi berhasil', `Slot ${reservation.slotCode} ditahan sampai ${until}.`);
    router.replace('/activity');
  }

  return (
    <PlateForm
      zoneName={zoneName}
      intro="Slot ditahan 15 menit. Kalau kendaraan belum masuk, reservasi batal otomatis. Tarif dikunci saat reservasi."
      submitLabel="Pesan slot"
      onSubmit={reserve}
    />
  );
}
