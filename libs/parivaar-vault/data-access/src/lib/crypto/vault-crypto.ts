import { arrayBufferToBase64, base64ToArrayBuffer } from '@pranav/shared-util';

const PBKDF2_ITERATIONS = 310_000;
const IV_BYTES = 12;

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new Error('Web Crypto is not available in this environment.');
  }
  return c.subtle;
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

/** Derives an AES-GCM key from a PIN/passphrase with PBKDF2-SHA256. */
export async function deriveKeyFromPin(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const material = await subtle().importKey(
    'raw',
    new TextEncoder().encode(pin.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle().deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Random data key that encrypts the vault contents. */
export function generateDataKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/** Encrypts bytes; the result is IV (12 bytes) followed by the ciphertext. */
export async function encryptBytes(
  key: CryptoKey,
  data: ArrayBuffer,
): Promise<ArrayBuffer> {
  const iv = randomBytes(IV_BYTES);
  const cipher = await subtle().encrypt({ name: 'AES-GCM', iv }, key, data);
  const out = new Uint8Array(IV_BYTES + cipher.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(cipher), IV_BYTES);
  return out.buffer;
}

/** Reverses {@link encryptBytes}. Throws when the key is wrong or data tampered. */
export async function decryptBytes(
  key: CryptoKey,
  payload: ArrayBuffer,
): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(payload);
  const iv = bytes.slice(0, IV_BYTES);
  const cipher = bytes.slice(IV_BYTES);
  return subtle().decrypt({ name: 'AES-GCM', iv }, key, cipher);
}

export async function encryptText(
  key: CryptoKey,
  text: string,
): Promise<string> {
  const enc = await encryptBytes(
    key,
    new TextEncoder().encode(text).buffer as ArrayBuffer,
  );
  return arrayBufferToBase64(enc);
}

export async function decryptText(
  key: CryptoKey,
  base64: string,
): Promise<string> {
  const dec = await decryptBytes(key, base64ToArrayBuffer(base64));
  return new TextDecoder().decode(dec);
}

/** Wraps the data key with the PIN key so it can be stored at rest. */
export async function wrapDataKey(
  dataKey: CryptoKey,
  pinKey: CryptoKey,
): Promise<string> {
  const raw = await subtle().exportKey('raw', dataKey);
  return arrayBufferToBase64(await encryptBytes(pinKey, raw));
}

/** Unwraps a stored data key. Rejects when the PIN key does not match. */
export async function unwrapDataKey(
  wrapped: string,
  pinKey: CryptoKey,
): Promise<CryptoKey> {
  const raw = await decryptBytes(pinKey, base64ToArrayBuffer(wrapped));
  return subtle().importKey(
    'raw',
    raw,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export function saltToBase64(salt: Uint8Array<ArrayBuffer>): string {
  return arrayBufferToBase64(salt.buffer);
}

export function saltFromBase64(base64: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(base64ToArrayBuffer(base64));
}
