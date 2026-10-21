import { TestBed } from '@angular/core/testing';
import { DocumentsRepository } from '../repositories/documents.repository';
import { FilesRepository } from '../repositories/files.repository';
import { MembersRepository } from '../repositories/members.repository';
import {
  CloudAuthError,
  SupabaseAuthService,
} from '../auth/supabase-auth.service';
import { VaultLockService } from '../lock/vault-lock.service';
import { VaultAccountService } from './vault-account.service';

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

describe('VaultAccountService with Supabase', () => {
  const members: unknown[] = [];
  const cloud = {
    isConfigured: true,
    identity: 'phone' as const,
    signUp: jest.fn(),
    verifyOtp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
    currentUser: jest.fn().mockResolvedValue(null),
    saveProfile: jest.fn().mockResolvedValue(undefined),
    saveKeyMaterial: jest.fn().mockResolvedValue(undefined),
    loadKeyMaterial: jest.fn().mockResolvedValue(null),
  };
  let service: VaultAccountService;
  let lock: VaultLockService;

  beforeEach(async () => {
    store.clear();
    members.length = 0;
    jest.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseAuthService, useValue: cloud },
        {
          provide: MembersRepository,
          useValue: {
            all: () => Promise.resolve([...members]),
            put: (m: unknown) => {
              members.push(m);
              return Promise.resolve('id');
            },
          },
        },
        {
          provide: DocumentsRepository,
          useValue: { all: () => Promise.resolve([]) },
        },
        { provide: FilesRepository, useValue: {} },
      ],
    });
    service = TestBed.inject(VaultAccountService);
    lock = TestBed.inject(VaultLockService);
    await lock.init();
  });

  it('signs up through Supabase, creates the local vault and uploads the wrapped key', async () => {
    cloud.signUp.mockResolvedValue({ userId: 'u1', needsVerification: null });
    const outcome = await service.signUp({
      familyName: 'Joshi Family',
      headName: 'Pranav Joshi',
      mobile: '9876543210',
      password: 'correct horse',
    });
    expect(outcome).toEqual({ status: 'ready' });
    expect(lock.status()).toBe('unlocked');
    expect(cloud.saveKeyMaterial).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        salt: expect.any(String),
        wrappedKey: expect.any(String),
      }),
    );
    expect(members).toHaveLength(1);
  }, 20_000);

  it('pauses sign-up until the SMS code is verified', async () => {
    cloud.signUp.mockResolvedValue({
      userId: 'u1',
      needsVerification: 'phone',
    });
    cloud.verifyOtp.mockResolvedValue('u1');
    const outcome = await service.signUp({
      familyName: 'F',
      headName: 'H',
      mobile: '9876543210',
      password: 'correct horse',
    });
    expect(outcome).toEqual({ status: 'verify', channel: 'phone' });
    expect(lock.status()).toBe('uninitialized');
    await service.verifySignUp('123456');
    expect(lock.status()).toBe('unlocked');
  }, 20_000);

  it('adopts the key material from Supabase on a new device', async () => {
    // Device A creates the vault.
    cloud.signUp.mockResolvedValue({ userId: 'u1', needsVerification: null });
    await service.signUp({
      familyName: 'F',
      headName: 'H',
      mobile: '9876543210',
      password: 'pw-strong',
    });
    const material = lock.keyMaterial();
    // Device B: no local vault, Supabase knows the user and the wrapped key.
    await lock.reset();
    cloud.signIn.mockResolvedValue({
      id: 'u1',
      account: { familyName: 'F', headName: 'H', mobile: '9876543210' },
    });
    cloud.loadKeyMaterial.mockResolvedValue(material);
    const result = await service.signIn('9876543210', 'pw-strong');
    expect(result.ok).toBe(true);
    expect(lock.keyMaterial()).toEqual(material);
  }, 30_000);

  it('surfaces Supabase credential errors without touching the local vault', async () => {
    cloud.signIn.mockRejectedValue(
      new CloudAuthError(
        'invalid-credentials',
        'Wrong mobile number or password.',
      ),
    );
    const result = await service.signIn('9876543210', 'nope');
    expect(result).toEqual({
      ok: false,
      reason: 'cloud',
      code: 'invalid-credentials',
      message: 'Wrong mobile number or password.',
    });
  });
});
