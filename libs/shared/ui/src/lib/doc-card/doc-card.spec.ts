import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocCard } from './doc-card';

describe('DocCard', () => {
  let fixture: ComponentFixture<DocCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocCard],
    }).compileComponents();
    fixture = TestBed.createComponent(DocCard);
    fixture.componentRef.setInput('doc', {
      type: 'aadhaar',
      fields: { 'Aadhaar Number': '7391 4820 1163', Name: 'Pranav Joshi' },
    });
    await fixture.whenStable();
  });

  it('masks the number on the mini card and uses the type skin', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.mini')?.classList.contains('aadhaar')).toBe(true);
    expect(el.textContent).toContain('XXXX XXXX 1163');
    expect(el.textContent).toContain('UIDAI');
  });

  it('shows the full number on the big card', async () => {
    fixture.componentRef.setInput('size', 'big');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      '7391 4820 1163',
    );
  });
});
