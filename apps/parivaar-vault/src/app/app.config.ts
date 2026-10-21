import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  provideRouter,
  RouteReuseStrategy,
  withComponentInputBinding,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular';
import {
  SUPABASE_CONFIG,
  SettingsService,
  VaultLockService,
} from '@pranav/pv-data-access';
import { environment } from '../environments/environment';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: SUPABASE_CONFIG, useValue: environment.supabase },
    provideIonicAngular({ mode: undefined }),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideAppInitializer(async () => {
      const lock = inject(VaultLockService);
      const settings = inject(SettingsService);
      await Promise.all([lock.init(), settings.init()]);
    }),
  ],
};
