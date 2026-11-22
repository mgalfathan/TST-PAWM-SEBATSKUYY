// Simpan token dengan aman: SecureStore di HP, localStorage di web.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function getItem(key) {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setItem(key, value) {
  if (Platform.OS === 'web') return globalThis.localStorage?.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

export async function removeItem(key) {
  if (Platform.OS === 'web') return globalThis.localStorage?.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}
