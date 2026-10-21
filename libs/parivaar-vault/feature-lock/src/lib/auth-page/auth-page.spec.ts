import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { VaultAccountService, VaultLockService } from '@pranav/pv-data-access';
import { AuthPage } from './auth-page';
import { passwordStrength } from './password-strength';

describe('AuthPage', () => {
  let fixture: ComponentFixture<AuthPage>;
  const status = signal<'uninitialized' | 'locked'>('uninitialized');
  const account = signal<{ familyName: string } | null>(null);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthPage],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        { provide: VaultLockService, useValue: { status, account } },
        {
          provide: VaultAccountService,
          useValue: {
            cloudEnabled: false,
            identity: 'phone',
            awaitingVerification: signal(false),
            rememberedIdentifier: () => Promise.resolve(''),
            signIn: jest.fn(),
            signUp: jest.fn(),
            verifySignUp: jest.fn(),
            cancelVerification: jest.fn(),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: new Map() } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AuthPage);
    await fixture.whenStable();
  });

  it('opens on Create account when there is no vault yet and says cloud sign-in is off', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Create family vault');
    expect(text).toContain('Family name');
    expect(text).toContain('Cloud sign-in is not configured');
  });

  it('rates password strength', () => {
    expect(passwordStrength('').score).toBe(0);
    expect(passwordStrength('abc').label).toBe('Weak');
    expect(passwordStrength('Correct-Horse-42!').label).toBe('Strong');
  });
});
