import { TestBed } from '@angular/core/testing';
import { VaultLockService } from './vault-lock.service';

const store = new Map<string, string>();
jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: ({ key }: { key: string }) =>
      Promise.resolve({ value: store.get(key) ?? null }),
    set: ({ key, value }: { key: string; value: string }) => {
      store.set(key, value);
      return Promise.resolve();
    },
    remove: ({ key }: { key: string }) => {
      store.delete(key);
      return Promise.resolve();
    },
  },
}));

describe('VaultLockService', () => {
  let lock: VaultLockService;
  const account = {
    familyName: 'Joshi Family',
    headName: 'Pranav Joshi',
    mobile: '9876543210',
    createdAt: '2026-10-21T00:00:00.000Z',
  };

  beforeEach(async () => {
    store.clear();
    TestBed.configureTestingModule({});
    lock = TestBed.inject(VaultLockService);
    await lock.init();
  });

  it('starts uninitialized, then signs in with the right mobile and password', async () => {
    expect(lock.status()).toBe('uninitialized');
    await lock.createVault(account, 'correct horse');
    expect(lock.status()).toBe('unlocked');
    lock.lock();
    expect(lock.status()).toBe('locked');

    expect(await lock.signIn('98765 43210', 'wrong')).toEqual({
      ok: false,
      reason: 'wrong-password',
    });
    expect(await lock.signIn('1111111111', 'correct horse')).toEqual({
      ok: false,
      reason: 'wrong-mobile',
    });
    expect(await lock.signIn('+91 9876543210', 'correct horse')).toEqual({
      ok: true,
    });
    expect(lock.isUnlocked()).toBe(true);
  }, 20_000);

  it('rate-limits after repeated failures', async () => {
    await lock.createVault(account, 'pw');
    lock.lock();
    for (let i = 0; i < 5; i++) await lock.signIn('9876543210', 'nope');
    const result = await lock.signIn('9876543210', 'pw');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('rate-limited');
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    }
  }, 30_000);
});
