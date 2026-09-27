/**
 * Storage adapter that lets Supabase persist its session in the device's
 * secure keystore (Keychain on iOS, EncryptedSharedPreferences on Android).
 *
 * WHY THIS FILE EXISTS
 * expo-secure-store is designed for small values and warns/fails above
 * roughly 2 KB per entry. A Supabase session (access token + refresh token
 * + user object) is regularly larger than that, so writing it directly is
 * unreliable on Android in particular.
 *
 * So we split large values into numbered chunks and store a small manifest
 * under the original key. Reads reassemble the chunks; writes clean up any
 * chunks left over from a previous, longer value.
 *
 * We store the SESSION TOKENS issued by Supabase — never the password, and
 * never anything in plain text on disk.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Kept comfortably under SecureStore's practical limit. */
const CHUNK_SIZE = 1536;
const MANIFEST_PREFIX = '__replog_chunked__:';
const MAX_CHUNKS = 64;

/**
 * expo-secure-store is not available on web. Falling back to AsyncStorage
 * there keeps `npx expo start --web` usable for quick UI checks; on a real
 * device the secure keystore is always used.
 */
const useSecureStore = Platform.OS === 'ios' || Platform.OS === 'android';

async function rawGet(key: string): Promise<string | null> {
  if (useSecureStore) return SecureStore.getItemAsync(key);
  return AsyncStorage.getItem(key);
}

async function rawSet(key: string, value: string): Promise<void> {
  if (useSecureStore) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

async function rawRemove(key: string): Promise<void> {
  if (useSecureStore) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

function chunkKey(key: string, index: number): string {
  return `${key}__c${index}`;
}

/** Delete chunk keys from `from` upward until one is missing. */
async function clearChunks(key: string, from = 0): Promise<void> {
  for (let i = from; i < MAX_CHUNKS; i += 1) {
    const existing = await rawGet(chunkKey(key, i));
    if (existing === null) break;
    await rawRemove(chunkKey(key, i));
  }
}

export const SecureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const head = await rawGet(key);
      if (head === null) return null;
      if (!head.startsWith(MANIFEST_PREFIX)) return head;

      const count = Number.parseInt(head.slice(MANIFEST_PREFIX.length), 10);
      if (!Number.isFinite(count) || count <= 0) return null;

      const parts: string[] = [];
      for (let i = 0; i < count; i += 1) {
        const part = await rawGet(chunkKey(key, i));
        // A missing chunk means the stored value is corrupt; treat the whole
        // entry as absent so Supabase falls back to signed-out rather than
        // trying to parse half a session.
        if (part === null) return null;
        parts.push(part);
      }
      return parts.join('');
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (value.length <= CHUNK_SIZE) {
        await rawSet(key, value);
        await clearChunks(key);
        return;
      }

      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += CHUNK_SIZE) {
        chunks.push(value.slice(i, i + CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i += 1) {
        await rawSet(chunkKey(key, i), chunks[i]);
      }
      await rawSet(key, `${MANIFEST_PREFIX}${chunks.length}`);
      // drop chunks belonging to a longer previous value
      await clearChunks(key, chunks.length);
    } catch {
      // Storage failures must not crash the app. Worst case the user has to
      // sign in again next launch.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await clearChunks(key);
      await rawRemove(key);
    } catch {
      // ignore
    }
  },
};
