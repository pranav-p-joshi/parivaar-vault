import { Route } from '@angular/router';
import { vaultUnlockedGuard } from '@pranav/pv-data-access';

export const appRoutes: Route[] = [
  {
    path: 'auth',
    loadChildren: () =>
      import('@pranav/pv-feature-lock').then((m) => m.authRoutes),
  },
  {
    path: 'who',
    canActivate: [vaultUnlockedGuard],
    loadChildren: () =>
      import('@pranav/pv-feature-lock').then((m) => m.whoRoutes),
  },
  {
    path: '',
    canActivate: [vaultUnlockedGuard],
    canActivateChild: [vaultUnlockedGuard],
    loadComponent: () => import('./tabs/tabs-page').then((m) => m.TabsPage),
    children: [
      {
        path: 'home',
        loadChildren: () =>
          import('@pranav/pv-feature-home').then((m) => m.homeRoutes),
      },
      {
        path: 'add',
        loadChildren: () =>
          import('@pranav/pv-feature-documents').then(
            (m) => m.addDocumentRoutes,
          ),
      },
      {
        path: 'doc',
        loadChildren: () =>
          import('@pranav/pv-feature-documents').then((m) => m.documentRoutes),
      },
      {
        path: 'family',
        loadChildren: () =>
          import('@pranav/pv-feature-members').then((m) => m.membersRoutes),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('@pranav/pv-feature-settings').then((m) => m.settingsRoutes),
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: 'lock', redirectTo: 'auth' },
  { path: '**', redirectTo: '' },
];
