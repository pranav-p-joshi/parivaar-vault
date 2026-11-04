import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import {
  DocumentsRepository,
  FilesRepository,
  MembersRepository,
  MembersStore,
} from '@pranav/pv-data-access';
import { MembersPage } from './members-page';
import { testMembers } from './test-fixtures';

describe('MembersPage', () => {
  let fixture: ComponentFixture<MembersPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembersPage],
      providers: [
        provideRouter([]),
        provideIonicAngular(),
        {
          provide: MembersRepository,
          useValue: { all: () => Promise.resolve(testMembers) },
        },
        {
          provide: DocumentsRepository,
          useValue: { all: () => Promise.resolve([]) },
        },
        { provide: FilesRepository, useValue: {} },
      ],
    }).compileComponents();
    await TestBed.inject(MembersStore).load();
    fixture = TestBed.createComponent(MembersPage);
    await fixture.whenStable();
  });

  it('lists family members with relation', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Sunita Joshi');
    expect(text).toContain('Mother');
    expect(text).toContain('4 members');
  });
});
