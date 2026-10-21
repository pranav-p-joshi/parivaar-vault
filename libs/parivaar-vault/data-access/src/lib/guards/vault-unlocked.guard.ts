import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { VaultLockService } from '../lock/vault-lock.service';

/** Redirects to sign-in unless the vault is unlocked. */
export const vaultUnlockedGuard: CanActivateFn = (_route, state) => {
  const lock = inject(VaultLockService);
  const router = inject(Router);
  if (lock.isUnlocked()) return true;
  return router.createUrlTree(['/auth'], {
    queryParams: { returnUrl: state.url },
  });
};
