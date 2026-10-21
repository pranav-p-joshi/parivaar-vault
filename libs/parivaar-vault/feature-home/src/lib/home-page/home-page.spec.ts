import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import {
  DocumentsRepository,
  DocumentsStore,
  FilesRepository,
  MembersRepository,
  MembersStore,
  SAMPLE_DOCUMENTS,
  SAMPLE_MEMBERS,
  VaultLockService,
} from '@pranav/pv-data-access';
import { HomePage } from './home-page';

describe('HomePage', () => {
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        {
          provide: MembersRepository,
          useValue: { all: () => Promise.resolve(SAMPLE_MEMBERS) },
        },
        {
          provide: DocumentsRepository,
          useValue: { all: () => Promise.resolve(SAMPLE_DOCUMENTS) },
        },
        { provide: FilesRepository, useValue: {} },
        {
          provide: VaultLockService,
          useValue: {
            account: signal({ familyName: 'Joshi Family' }),
            status: signal('unlocked'),
          },
        },
      ],
    }).compileComponents();
    await TestBed.inject(MembersStore).load();
    await TestBed.inject(DocumentsStore).load();
    fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
  });

  it('shows the member hero, chips and the issued and uploaded lists', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Pranav Joshi');
    expect(text).toContain('Joshi Family');
    expect(text).toContain('Share all');
    expect(text).toContain('Sunita');
    expect(text).toContain('Aadhaar Card');
    expect(text).toContain('Health Insurance Card');
    expect(text).toContain('XXXX XXXX 1163');
    expect(text).not.toContain('7391 4820 1163');
  });
});
