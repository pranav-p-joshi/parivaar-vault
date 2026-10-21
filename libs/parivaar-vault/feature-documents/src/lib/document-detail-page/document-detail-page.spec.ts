import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import {
  DocumentsRepository,
  DocumentsStore,
  FilesRepository,
  MembersRepository,
  MembersStore,
  SAMPLE_DOCUMENTS,
  SAMPLE_MEMBERS,
} from '@pranav/pv-data-access';
import { DocumentDetailPage } from './document-detail-page';

describe('DocumentDetailPage', () => {
  let fixture: ComponentFixture<DocumentDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentDetailPage],
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
        {
          provide: FilesRepository,
          useValue: { getMeta: () => Promise.resolve(undefined) },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['id', 'sample-d8']]) } },
        },
      ],
    }).compileComponents();
    await TestBed.inject(MembersStore).load();
    await TestBed.inject(DocumentsStore).load();
    fixture = TestBed.createComponent(DocumentDetailPage);
    await fixture.whenStable();
  });

  it('renders an uploaded document with its fields and the uploaded banner', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Birth Certificate');
    expect(text).toContain('Uploaded by you');
    expect(text).toContain('BMC/2019/AW/004471');
    expect(text).toContain('Brihanmumbai Municipal Corporation');
  });
});
