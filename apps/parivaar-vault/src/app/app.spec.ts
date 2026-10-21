import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import {
  DocumentsRepository,
  FilesRepository,
  MembersRepository,
  DocumentTypesRepository,
} from '@pranav/pv-data-access';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        {
          provide: MembersRepository,
          useValue: { all: () => Promise.resolve([]) },
        },
        {
          provide: DocumentsRepository,
          useValue: { all: () => Promise.resolve([]) },
        },
        {
          provide: DocumentTypesRepository,
          useValue: { all: () => Promise.resolve([]) },
        },
        { provide: FilesRepository, useValue: {} },
      ],
    }).compileComponents();
  });

  it('should create the app shell', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('ion-app')).toBeTruthy();
  });
});
