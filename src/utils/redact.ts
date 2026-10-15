/**
 * Log-safe copies of API payloads.
 *
 * Release builds keep console.* output, and anyone with the device and adb can
 * read it from logcat. Auth responses carry the one-time `code`, the tenant
 * `client_secret` and access/refresh tokens, so anything logged from an auth
 * flow goes through redact() first.
 */

const SENSITIVE_KEYS = new Set([
  'code',
  'client_secret',
  'clientsecret',
  'password',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'id_token',
  'idtoken',
  'device_token',
  'authorization',
  'secret',
]);

const MAX_DEPTH = 8;

const redactValue = (value: unknown, depth: number): unknown => {
  if (value === null || typeof value !== 'object' || depth > MAX_DEPTH) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => redactValue(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = val === null || val === undefined || val === '' ? val : '***';
    } else {
      out[key] = redactValue(val, depth + 1);
    }
  }
  return out;
};

/** Deep copy of `value` with every sensitive field replaced by '***'. */
export const redact = <T>(value: T): T => redactValue(value, 0) as T;

/** JSON.stringify(redact(value)) for log lines. */
export const redactJson = (value: unknown, space?: number): string =>
  JSON.stringify(redact(value), null, space);
