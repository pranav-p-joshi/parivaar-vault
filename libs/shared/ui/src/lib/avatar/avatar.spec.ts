import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Avatar } from './avatar';

describe('Avatar', () => {
  let fixture: ComponentFixture<Avatar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Avatar],
    }).compileComponents();
    fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('name', 'Asha Joshi');
    await fixture.whenStable();
  });

  it('renders initials', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent?.trim()).toBe('AJ');
  });
});
