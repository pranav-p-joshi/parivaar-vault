import { TestBed } from '@angular/core/testing';
import { OcrService } from './ocr.service';

// The dynamic `import('tesseract.js')` itself rejects in this spec.
jest.mock('tesseract.js', () => {
  throw new Error('tesseract.js is not available in this environment');
});

describe('OcrService when tesseract.js cannot be imported', () => {
  it('resolves to the empty result instead of throwing', async () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(OcrService);
    expect(service.isNative).toBe(false);
    await expect(
      service.recognize(new Blob(['x'], { type: 'image/png' })),
    ).resolves.toEqual({
      text: '',
      lines: [],
      confidence: 0,
    });
  });
});
