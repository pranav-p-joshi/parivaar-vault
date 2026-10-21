import { Injectable, type OnDestroy } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import {
  TextRecognition,
  type ProcessImageResult,
} from '@capacitor-mlkit/text-recognition';
import { arrayBufferToBase64 } from '@pranav/shared-util';
import type { Worker as TesseractWorker } from 'tesseract.js';
import { normalizeOcrLines } from './extractors/common';
import { EMPTY_OCR_RESULT, type OcrResult } from './types';

/** ML Kit reports no confidence; non-empty output is treated as reliable. */
const NATIVE_CONFIDENCE = 0.85;

/**
 * On-device OCR. Native platforms use ML Kit text recognition through a
 * temporary file in the app cache; the browser lazily loads tesseract.js so
 * it stays out of the initial bundle. `recognize` never rejects.
 */
@Injectable({ providedIn: 'root' })
export class OcrService implements OnDestroy {
  readonly isNative: boolean = Capacitor.isNativePlatform();

  /** One tesseract worker is created on first use and reused afterwards. */
  private worker: Promise<TesseractWorker> | undefined;

  async recognize(image: Blob): Promise<OcrResult> {
    try {
      const result = this.isNative
        ? await this.recognizeNative(image)
        : await this.recognizeWeb(image);
      return result ?? { ...EMPTY_OCR_RESULT, lines: [] };
    } catch {
      return { ...EMPTY_OCR_RESULT, lines: [] };
    }
  }

  ngOnDestroy(): void {
    void this.terminateWorker();
  }

  private async recognizeNative(image: Blob): Promise<OcrResult> {
    const path = `ocr/scan-${Date.now()}-${Math.random().toString(36).slice(2)}.${extensionFor(image.type)}`;
    const data = arrayBufferToBase64(await image.arrayBuffer());
    const written = await Filesystem.writeFile({
      path,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    try {
      const result = await TextRecognition.processImage({ path: written.uri });
      return mapNativeResult(result);
    } finally {
      await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(
        () => undefined,
      );
    }
  }

  private async recognizeWeb(image: Blob): Promise<OcrResult> {
    const worker = await this.getWorker();
    try {
      const { data } = await worker.recognize(
        image,
        {},
        { text: true, blocks: true },
      );
      const text = data.text ?? '';
      const fromBlocks = (data.blocks ?? []).flatMap((block) =>
        block.paragraphs.flatMap((paragraph) =>
          paragraph.lines.map((line) => line.text),
        ),
      );
      const lines = fromBlocks.length
        ? fromBlocks.flatMap(normalizeOcrLines)
        : normalizeOcrLines(text);
      const confidence = Number.isFinite(data.confidence)
        ? Math.min(1, Math.max(0, data.confidence / 100))
        : 0;
      return {
        text: text.trim(),
        lines,
        confidence: lines.length ? confidence : 0,
      };
    } catch (error) {
      // A broken worker is discarded so the next call starts fresh.
      await this.terminateWorker();
      throw error;
    }
  }

  private getWorker(): Promise<TesseractWorker> {
    if (!this.worker) {
      // Dynamic import keeps tesseract.js (and its wasm) out of the initial bundle.
      this.worker = import('tesseract.js')
        .then((tesseract) => tesseract.createWorker('eng'))
        .catch((error: unknown) => {
          this.worker = undefined;
          throw error;
        });
    }
    return this.worker;
  }

  private async terminateWorker(): Promise<void> {
    const pending = this.worker;
    this.worker = undefined;
    if (!pending) return;
    try {
      await (await pending).terminate();
    } catch {
      // Already gone; nothing to release.
    }
  }
}

function mapNativeResult(result: ProcessImageResult): OcrResult {
  const lines = (result.blocks ?? [])
    .flatMap((block) => block.lines.map((line) => line.text))
    .flatMap(normalizeOcrLines);
  const text = (result.text ?? '').trim() || lines.join('\n');
  return {
    text,
    lines: lines.length ? lines : normalizeOcrLines(text),
    confidence: text ? NATIVE_CONFIDENCE : 0,
  };
}

function extensionFor(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}
