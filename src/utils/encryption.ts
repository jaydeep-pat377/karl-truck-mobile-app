import { gcm } from '@noble/ciphers/aes.js';
import { hexToBytes, bytesToHex, concatBytes } from '@noble/ciphers/utils.js';
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

const getKey = (): Uint8Array => {
  if (cachedKey) return cachedKey;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY is not configured in .env');
  }
  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
  const key = hexToBytes(ENCRYPTION_KEY);
  cachedKey = key;
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
    // GCM nonce: 12 random bytes. Math.random is fine here — nonce-uniqueness
    // (not unpredictability) is what GCM requires, and 96 bits of entropy
    // makes collision astronomically unlikely.
    const iv = new Uint8Array(12);
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

export const decryptValue = (encrypted: string | null | undefined): string | null => {
  if (!encrypted) return null;
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    console.warn('[encryption] decryptValue: unexpected format, expected iv:tag:ciphertext');
    return null;
  }
  try {
    const [ivHex, tagHex, ctHex] = parts;
    const iv = hexToBytes(ivHex);
    const tag = hexToBytes(tagHex);
    const ct = hexToBytes(ctHex);
    const combined = concatBytes(ct, tag);
    const plaintext = gcm(getKey(), iv).decrypt(combined);
    // Avoid noble's bytesToUtf8 (uses TextDecoder, missing in Hermes).
    // Buffer is already a project dep via the 'buffer' package.
    return Buffer.from(plaintext).toString('utf8');
  } catch (err: any) {
    console.error('[encryption] decryptValue failed:', err?.message);
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
