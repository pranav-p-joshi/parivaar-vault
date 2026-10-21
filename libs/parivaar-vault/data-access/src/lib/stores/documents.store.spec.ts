import { TestBed } from '@angular/core/testing';
import type { VaultDocument } from '@pranav/shared-models';
import { DocumentsRepository } from '../repositories/documents.repository';
import { FilesRepository } from '../repositories/files.repository';
import { DocumentsStore } from './documents.store';

function doc(partial: Partial<VaultDocument>): VaultDocument {
  return {
    id: partial.id ?? Math.random().toString(36).slice(2),
    memberId: 'm1',
    type: 'passport',
    source: 'issued',
    fields: {},
    files: {},
    addedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

describe('DocumentsStore', () => {
  let store: DocumentsStore;

  beforeEach(async () => {
    const docs = [
      doc({
        id: 'a',
        fields: { 'Passport Number': 'N8831047', 'Date of Expiry': inDays(10) },
      }),
      doc({
        id: 'b',
        type: 'other',
        source: 'uploaded',
        fields: {
          'Document Title': 'Car insurance',
          'Expiry Date': inDays(-5),
        },
      }),
      doc({
        id: 'c',
        type: 'pan',
        memberId: 'm2',
        fields: { PAN: 'ABCDE1234F', Name: 'RAVI' },
      }),
    ];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DocumentsRepository,
          useValue: { all: () => Promise.resolve(docs) },
        },
        { provide: FilesRepository, useValue: {} },
      ],
    });
    store = TestBed.inject(DocumentsStore);
    await store.load();
  });

  it('computes reminders from registry expiry fields, soonest first', () => {
    const reminders = store.reminders();
    expect(reminders.map((r) => r.document.id)).toEqual(['b', 'a']);
    expect(reminders[0]?.status).toBe('expired');
    expect(reminders[1]?.status).toBe('critical');
  });

  it('splits issued and uploaded documents per member', () => {
    expect(store.issuedFor('m1').map((d) => d.id)).toEqual(['a']);
    expect(store.uploadedFor('m1').map((d) => d.id)).toEqual(['b']);
    expect(store.countFor('m2')).toBe(1);
  });

  it('searches across field values', () => {
    expect(store.search('abcde').map((d) => d.id)).toEqual(['c']);
    expect(store.search('insurance', 'm1').map((d) => d.id)).toEqual(['b']);
  });
});
