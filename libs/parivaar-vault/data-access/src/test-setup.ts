import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// jsdom lacks Web Crypto and (in some versions) TextEncoder; use Node's implementations.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}
