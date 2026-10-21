import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonSpinner,
} from '@ionic/angular';
import {
  CloudAuthError,
  VaultAccountService,
  VaultLockService,
} from '@pranav/pv-data-access';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { passwordStrength } from './password-strength';

type Tab = 'signin' | 'signup';

@Component({
  selector: 'pv-auth-page',
  imports: [
    FormsModule,
    IonContent,
    IonInput,
    IonInputPasswordToggle,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonSpinner,
  ],
  templateUrl: './auth-page.html',
  styleUrl: './auth-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPage {
  private readonly lock = inject(VaultLockService);
  private readonly account = inject(VaultAccountService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly cloudEnabled = this.account.cloudEnabled;
  protected readonly usesPhone = this.account.identity === 'phone';
  protected readonly hasLocalVault = computed(
    () => this.lock.status() === 'locked' || this.lock.status() === 'unlocked',
  );
  /** With a cloud account, sign-in is always possible (even on a fresh device). */
  protected readonly canSignIn = computed(
    () => this.cloudEnabled || this.hasLocalVault(),
  );
  protected readonly tab = signal<Tab>(
    this.hasLocalVault() ? 'signin' : 'signup',
  );
  protected readonly busy = signal(false);
  protected readonly familyName = computed(
    () => this.lock.account()?.familyName ?? '',
  );
  protected readonly awaitingCode = this.account.awaitingVerification;

  // Sign in
  protected readonly siIdentifier = signal('');
  protected readonly siPassword = signal('');
  protected readonly siError = signal('');

  // Sign up
  protected readonly suFamily = signal('');
  protected readonly suName = signal('');
  protected readonly suMobile = signal('');
  protected readonly suEmail = signal('');
  protected readonly suPassword = signal('');
  protected readonly suConfirm = signal('');
  protected readonly suTerms = signal(false);
  protected readonly suError = signal('');
  protected readonly strength = computed(() =>
    passwordStrength(this.suPassword()),
  );

  // Verification
  protected readonly code = signal('');
  protected readonly codeError = signal('');
  protected readonly verifyChannel = signal<'phone' | 'email'>('phone');

  constructor() {
    addIcons({ shieldCheckmarkOutline, cloudOfflineOutline });
    void this.account.rememberedIdentifier().then((value) => {
      if (value && !this.siIdentifier()) this.siIdentifier.set(value);
    });
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
    this.siError.set('');
    this.suError.set('');
  }

  protected digits(
    value: string | number | null | undefined,
    max = 10,
  ): string {
    return String(value ?? '')
      .replace(/\D/g, '')
      .slice(0, max);
  }

  protected async signIn(): Promise<void> {
    if (this.busy()) return;
    const identifier = this.siIdentifier().trim();
    if (this.usesPhone ? identifier.length !== 10 : !identifier.includes('@')) {
      return this.siError.set(
        this.usesPhone
          ? 'Enter your 10-digit mobile number.'
          : 'Enter your email address.',
      );
    }
    if (!this.siPassword()) return this.siError.set('Enter your password.');
    this.busy.set(true);
    try {
      const result = await this.account.signIn(identifier, this.siPassword());
      if (result.ok) {
        this.siPassword.set('');
        await this.continueToVault();
        return;
      }
      switch (result.reason) {
        case 'cloud':
          this.siError.set(result.message);
          if (result.code === 'not-confirmed' && this.usesPhone)
            this.siError.set(
              'This number is not confirmed yet. Create the account again to receive a new code.',
            );
          break;
        case 'rate-limited':
          this.siError.set(
            `Too many attempts. Try again in ${result.retryAfterSeconds ?? 30} seconds.`,
          );
          break;
        case 'wrong-mobile':
          this.siError.set('That does not match the vault on this device.');
          break;
        case 'no-account':
          this.siError.set(
            'No vault on this device yet. Create an account first.',
          );
          this.tab.set('signup');
          break;
        default:
          this.siError.set(
            'Wrong password. Documents can only be decrypted with the right password.',
          );
      }
    } catch (error) {
      this.siError.set(
        error instanceof Error ? error.message : 'Sign-in failed.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async signUp(): Promise<void> {
    if (this.busy()) return;
    if (!this.suFamily().trim())
      return this.suError.set('Give your family vault a name.');
    if (!this.suName().trim()) return this.suError.set('Enter your name.');
    if (this.suMobile().length !== 10)
      return this.suError.set('Enter a 10-digit mobile number.');
    const email = this.suEmail().trim();
    if (!this.usesPhone && !email)
      return this.suError.set('Enter your email address.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return this.suError.set('That email does not look right.');
    if (this.suPassword().length < 8)
      return this.suError.set('Use at least 8 characters for the password.');
    if (this.suPassword() !== this.suConfirm())
      return this.suError.set("Passwords don't match.");
    if (!this.suTerms())
      return this.suError.set('Please accept the note above.');
    this.suError.set('');
    this.busy.set(true);
    try {
      const outcome = await this.account.signUp({
        familyName: this.suFamily(),
        headName: this.suName(),
        mobile: this.suMobile(),
        email,
        password: this.suPassword(),
      });
      if (outcome.status === 'verify') {
        this.verifyChannel.set(outcome.channel);
        this.code.set('');
        this.codeError.set('');
        return;
      }
      this.suPassword.set('');
      this.suConfirm.set('');
      await this.continueToVault();
    } catch (error) {
      this.suError.set(
        error instanceof CloudAuthError
          ? error.message
          : 'Could not create the account.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async verify(): Promise<void> {
    if (this.busy()) return;
    if (this.code().length < 4)
      return this.codeError.set('Enter the code you received.');
    this.busy.set(true);
    try {
      await this.account.verifySignUp(this.code());
      this.suPassword.set('');
      this.suConfirm.set('');
      await this.continueToVault();
    } catch (error) {
      this.codeError.set(
        error instanceof Error ? error.message : 'Verification failed.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  /** After clicking the email confirmation link, the vault is created at first sign-in. */
  protected goToSignIn(): void {
    this.account.cancelVerification();
    this.siIdentifier.set(
      this.usesPhone ? this.suMobile() : this.suEmail().trim(),
    );
    this.siPassword.set(this.suPassword());
    this.codeError.set('');
    this.tab.set('signin');
  }

  protected cancelVerify(): void {
    this.account.cancelVerification();
    this.codeError.set('');
  }

  private continueToVault(): Promise<boolean> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return this.router.navigateByUrl('/who', {
      replaceUrl: true,
      state: { returnUrl },
    });
  }
}
