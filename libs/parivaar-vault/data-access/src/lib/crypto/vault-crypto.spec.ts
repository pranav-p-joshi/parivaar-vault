import {
  decryptBytes,
  decryptText,
  deriveKeyFromPin,
  encryptBytes,
  encryptText,
  generateDataKey,
  randomBytes,
  unwrapDataKey,
  wrapDataKey,
} from './vault-crypto';

describe('vault-crypto', () => {
  it('encrypts and decrypts bytes with a data key', async () => {
    const key = await generateDataKey();
    const input = new TextEncoder().encode('hello vault').buffer as ArrayBuffer;
    const cipher = await encryptBytes(key, input);
    expect(cipher.byteLength).toBeGreaterThan(input.byteLength);
    const plain = await decryptBytes(key, cipher);
    expect(new TextDecoder().decode(plain)).toBe('hello vault');
  });

  it('wraps the data key with a PIN and unwraps it with the same PIN only', async () => {
    const salt = randomBytes(16);
    const dataKey = await generateDataKey();
    const wrapped = await wrapDataKey(
      dataKey,
      await deriveKeyFromPin('1234', salt),
    );

    const unwrapped = await unwrapDataKey(
      wrapped,
      await deriveKeyFromPin('1234', salt),
    );
    const secret = await encryptText(dataKey, 'PAN ABCDE1234F');
    expect(await decryptText(unwrapped, secret)).toBe('PAN ABCDE1234F');

    await expect(
      unwrapDataKey(wrapped, await deriveKeyFromPin('9999', salt)),
    ).rejects.toBeTruthy();
  });
});
