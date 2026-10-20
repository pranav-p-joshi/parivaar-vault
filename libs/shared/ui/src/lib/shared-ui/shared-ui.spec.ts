import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharedUi } from './shared-ui';

describe('SharedUi', () => {
  let fixture: ComponentFixture<SharedUi>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedUi],
    }).compileComponents();

    fixture = TestBed.createComponent(SharedUi);
    fixture.componentRef.setInput('appName', 'Test App');
    await fixture.whenStable();
  });

  it('should render the app name', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test App');
  });
});
