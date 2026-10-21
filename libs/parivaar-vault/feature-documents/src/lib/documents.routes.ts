import type { Route } from '@angular/router';
import { AddDocumentPage } from './add-document-page/add-document-page';
import { DocumentDetailPage } from './document-detail-page/document-detail-page';

/** Mounted at /doc */
export const documentRoutes: Route[] = [
  { path: ':id', component: DocumentDetailPage },
  { path: ':id/edit', component: AddDocumentPage },
];

/** Mounted at /add */
export const addDocumentRoutes: Route[] = [
  { path: '', component: AddDocumentPage },
];
