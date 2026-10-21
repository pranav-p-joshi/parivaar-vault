import { TestBed } from '@angular/core/testing';
import { OcrService } from './ocr.service';

const createWorker = jest.fn();
const recognize = jest.fn();
const terminate = jest.fn();

jest.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => createWorker(...args),
}));

const EMPTY = { text: '', lines: [], confidence: 0 };

describe('OcrService (web)', () => {
  let service: OcrService;

  beforeEach(() => {
    jest.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(OcrService);
  });

  it('is not native under jsdom', () => {
    expect(service.isNative).toBe(false);
  });

  it('resolves to the empty result when the worker cannot be created', async () => {
    createWorker.mockRejectedValue(new Error('wasm unavailable'));
    await expect(
      service.recognize(new Blob(['x'], { type: 'image/png' })),
    ).resolves.toEqual(EMPTY);
    expect(createWorker).toHaveBeenCalledWith('eng');
  });

  it('maps tesseract output to OcrResult and reuses the worker', async () => {
    createWorker.mockResolvedValue({ recognize, terminate });
    recognize.mockResolvedValue({
      data: {
        text: ' Government of India \nRahul Sharma\n',
        confidence: 87,
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  { text: ' Government of India \n' },
                  { text: 'Rahul Sharma\n' },
                ],
              },
            ],
          },
        ],
      },
    });

    const first = await service.recognize(
      new Blob(['x'], { type: 'image/jpeg' }),
    );
    expect(first).toEqual({
      text: 'Government of India \nRahul Sharma',
      lines: ['Government of India', 'Rahul Sharma'],
      confidence: 0.87,
    });

    await service.recognize(new Blob(['y'], { type: 'image/jpeg' }));
    expect(createWorker).toHaveBeenCalledTimes(1);
    expect(recognize).toHaveBeenCalledTimes(2);
    expect(recognize.mock.calls[0]?.[2]).toEqual({ text: true, blocks: true });
  });

  it('falls back to splitting text when no blocks are returned', async () => {
    createWorker.mockResolvedValue({ recognize, terminate });
    recognize.mockResolvedValue({
      data: { text: 'A\n\nB', confidence: 50, blocks: null },
    });
    await expect(service.recognize(new Blob(['x']))).resolves.toEqual({
      text: 'A\n\nB',
      lines: ['A', 'B'],
      confidence: 0.5,
    });
  });

  it('discards a failing worker and resolves to the empty result', async () => {
    createWorker.mockResolvedValue({ recognize, terminate });
    recognize.mockRejectedValue(new Error('boom'));
    await expect(service.recognize(new Blob(['x']))).resolves.toEqual(EMPTY);
    expect(terminate).toHaveBeenCalledTimes(1);

    recognize.mockResolvedValue({
      data: { text: 'ok', confidence: 90, blocks: null },
    });
    await expect(service.recognize(new Blob(['x']))).resolves.toEqual({
      text: 'ok',
      lines: ['ok'],
      confidence: 0.9,
    });
    expect(createWorker).toHaveBeenCalledTimes(2);
  });

  it('terminates the cached worker on destroy', async () => {
    createWorker.mockResolvedValue({ recognize, terminate });
    recognize.mockResolvedValue({
      data: { text: 'ok', confidence: 90, blocks: null },
    });
    await service.recognize(new Blob(['x']));
    service.ngOnDestroy();
    await Promise.resolve();
    await Promise.resolve();
    expect(terminate).toHaveBeenCalledTimes(1);
  });
});
