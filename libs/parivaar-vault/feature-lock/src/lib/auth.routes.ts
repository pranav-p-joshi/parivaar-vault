import type { Route } from '@angular/router';
import { AuthPage } from './auth-page/auth-page';
import { WhoPage } from './who-page/who-page';

/** Mounted at /auth (sign in / create account). */
export const authRoutes: Route[] = [{ path: '', component: AuthPage }];

/** Mounted at /who (member picker, requires an unlocked vault). */
export const whoRoutes: Route[] = [{ path: '', component: WhoPage }];

/** Kept for backwards compatibility with earlier app routes. */
export const lockRoutes = authRoutes;
