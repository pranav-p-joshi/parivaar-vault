import type { Route } from '@angular/router';
import { MemberFormPage } from './member-form-page/member-form-page';
import { MembersPage } from './members-page/members-page';

export const membersRoutes: Route[] = [
  { path: '', component: MembersPage },
  { path: 'new', component: MemberFormPage },
  { path: ':id/edit', component: MemberFormPage },
];
