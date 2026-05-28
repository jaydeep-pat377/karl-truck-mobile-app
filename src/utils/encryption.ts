import { gcm } from '@noble/ciphers/aes.js';
import { hexToBytes, bytesToHex, concatBytes, utf8ToBytes } from '@noble/ciphers/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';
import { ENCRYPTION_KEY } from '@env';

export interface EncryptedSupabaseConfig {
  SUPABASE_URL: string | null;
  SUPABASE_ANON_KEY: string | null;
  SUPABASE_SERVICE_ROLE_KEY: string | null;
}

export interface DecryptedSupabaseConfig {
  SUPABASE_URL: string | null;
  SUPABASE_ANON_KEY: string | null;
  SUPABASE_SERVICE_ROLE_KEY: string | null;
}

let cachedKey: Uint8Array | null = null;
let cachedAdminKey: Uint8Array | null = null;

/** Mobile/backend key: direct hex decode of ENCRYPTION_KEY (12-byte IV) */
const getKey = (): Uint8Array => {
  if (cachedKey) return cachedKey;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not configured in .env');
  }
  // admin-truckast-ai encrypts using SHA-256(ENCRYPTION_SECRET_KEY) as the AES
  // key. Mirror that derivation so values written by admin can be decrypted
  // here.
  cachedKey = sha256(utf8ToBytes(ENCRYPTION_KEY));
  return cachedKey;
};

/** Admin panel key: SHA256 hash of the ENCRYPTION_KEY string (16-byte IV) */
const getAdminKey = (): Uint8Array => {
  if (cachedAdminKey) return cachedAdminKey;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not configured in .env');
  }
  const hash = CryptoJS.SHA256(ENCRYPTION_KEY);
  const hexStr = hash.toString(CryptoJS.enc.Hex);
  const key = hexToBytes(hexStr);
  cachedAdminKey = key;
  return key;
};

const ENCRYPTED_FORMAT = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i;

/**
 * AES-256-GCM encrypt a string. Output matches the backend's
 * `iv(hex):authTag(hex):ciphertext(hex)` format. Used to encrypt sensitive
 * values (Supabase URL / keys) before persisting to AsyncStorage so they're
 * not at rest in plaintext on the device.
 *
 * Note: ENCRYPTION_KEY lives in the bundle, so this is defense-in-depth, not
 * a confidentiality boundary against a determined attacker with the APK.
 */
export const encryptValue = (plaintext: string | null | undefined): string | null => {
  if (!plaintext) return null;
  // If the value is already in our encrypted format, don't double-encrypt.
  if (ENCRYPTED_FORMAT.test(plaintext)) return plaintext;
  try {
    const key = getKey();
    // 16-byte IV to match admin-truckast-ai's encryption format.
    const iv = new Uint8Array(16);
    for (let i = 0; i < iv.length; i++) iv[i] = (Math.random() * 256) | 0;
    const plaintextBytes = new Uint8Array(Buffer.from(plaintext, 'utf8'));
    const ctWithTag = gcm(key, iv).encrypt(plaintextBytes);
    // noble GCM returns ciphertext||authTag (16-byte tag at the end)
    const tagStart = ctWithTag.length - 16;
    const ct = ctWithTag.slice(0, tagStart);
    const tag = ctWithTag.slice(tagStart);
    return `${bytesToHex(iv)}:${bytesToHex(tag)}:${bytesToHex(ct)}`;
  } catch (err: any) {
    console.error('[encryption] encryptValue failed:', err?.message);
    return null;
  }
};

/**
 * Decrypt an AES-256-GCM encrypted value.
 *
 * Supports two key derivation methods:
 *   - Backend/mobile format: 12-byte IV, key = hex_decode(ENCRYPTION_KEY)
 *   - Admin panel format:    16-byte IV, key = SHA256(ENCRYPTION_KEY)
 *
 * Tries the appropriate key based on IV length, falls back to the other.
 */
export const decryptValue = (encrypted: string | null | undefined): string | null => {
  if (!encrypted) return null;
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    console.warn('[encryption] decryptValue: unexpected format, expected iv:tag:ciphertext');
    return null;
  }
  const [ivHex, tagHex, ctHex] = parts;
  const iv = hexToBytes(ivHex);
  const tag = hexToBytes(tagHex);
  const ct = hexToBytes(ctHex);
  const combined = concatBytes(ct, tag);

  // Determine primary key based on IV length:
  //   12 bytes → backend/mobile format (direct hex key)
  //   16 bytes → admin panel format (SHA256 key)
  const primaryKey = iv.length === 12 ? getKey() : getAdminKey();
  const fallbackKey = iv.length === 12 ? getAdminKey() : getKey();

  // Try primary key first
  try {
    const plaintext = gcm(primaryKey, iv).decrypt(combined);
    return Buffer.from(plaintext).toString('utf8');
  } catch {
    // Primary failed, try fallback
  }

  // Try fallback key
  try {
    const plaintext = gcm(fallbackKey, iv).decrypt(combined);
    return Buffer.from(plaintext).toString('utf8');
  } catch (err: any) {
    console.error('[encryption] decryptValue failed with both keys:', err?.message);
    return null;
  }
};

export const decryptSupabaseConfig = (
  config: EncryptedSupabaseConfig | null | undefined,
): DecryptedSupabaseConfig => {
  if (!config) {
    return { SUPABASE_URL: null, SUPABASE_ANON_KEY: null, SUPABASE_SERVICE_ROLE_KEY: null };
  }
  return {
    SUPABASE_URL: decryptValue(config.SUPABASE_URL),
    SUPABASE_ANON_KEY: decryptValue(config.SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: decryptValue(config.SUPABASE_SERVICE_ROLE_KEY),
  };
};
