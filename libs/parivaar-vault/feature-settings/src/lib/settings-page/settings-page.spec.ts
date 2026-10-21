import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import {
  DocumentsRepository,
  FilesRepository,
  MembersRepository,
} from '@pranav/pv-data-access';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  let fixture: ComponentFixture<SettingsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
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
        { provide: FilesRepository, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SettingsPage);
    await fixture.whenStable();
  });

  it('shows lock, DigiLocker and backup sections', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Change password');
    expect(text).toContain('Sign out');
    expect(text).toContain('Connect DigiLocker');
    expect(text).toContain('Export backup');
  });
});
