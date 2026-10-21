import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  arrayBufferToBase64,
  compressImage,
  downloadBlob,
} from '@pranav/shared-util';

export type PickSource = 'camera' | 'photos' | 'files';

export interface PickedFile {
  blob: Blob;
  name: string;
}

const ACCEPT = 'image/*,application/pdf';

/** Thin wrapper over Capacitor plugins with browser fallbacks. */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  readonly isNative = Capacitor.isNativePlatform();
  readonly platform = Capacitor.getPlatform();

  /** Returns picked files, images already downscaled. Empty when the user cancels. */
  async pickFiles(source: PickSource): Promise<PickedFile[]> {
    try {
      if (source === 'files' || (!this.isNative && source === 'photos')) {
        return await this.pickWithInput(source === 'files');
      }
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
        quality: 85,
        correctOrientation: true,
      });
      if (!photo.webPath) return [];
      const raw = await (await fetch(photo.webPath)).blob();
      const blob = await compressImage(raw);
      const ext = (photo.format || 'jpeg').replace('jpg', 'jpeg');
      return [
        { blob, name: `scan-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}` },
      ];
    } catch {
      // Cancelled or permission denied.
      return [];
    }
  }

  /** Picks a single file; returns undefined when cancelled. */
  async pickOne(source: PickSource): Promise<PickedFile | undefined> {
    const [first] = await this.pickFiles(source);
    return first;
  }

  /** Shares (native) or downloads (web) a blob. */
  async shareBlob(
    blob: Blob,
    filename: string,
    title = filename,
  ): Promise<void> {
    if (!this.isNative) {
      downloadBlob(blob, filename);
      return;
    }
    const data = arrayBufferToBase64(await blob.arrayBuffer());
    const written = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
    });
    await Share.share({ title, url: written.uri });
  }

  /** Opens a blob in a new browser tab (web) or hands it to the OS (native). */
  async openBlob(blob: Blob, filename: string): Promise<void> {
    if (this.isNative) {
      await this.shareBlob(blob, filename);
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  private pickWithInput(multiple: boolean): Promise<PickedFile[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = ACCEPT;
      input.multiple = multiple;
      input.style.display = 'none';
      document.body.appendChild(input);
      const finish = async () => {
        const files = Array.from(input.files ?? []);
        input.remove();
        const picked: PickedFile[] = [];
        for (const file of files) {
          picked.push({ blob: await compressImage(file), name: file.name });
        }
        resolve(picked);
      };
      input.addEventListener('change', () => void finish(), { once: true });
      input.addEventListener(
        'cancel',
        () => {
          input.remove();
          resolve([]);
        },
        { once: true },
      );
      input.click();
    });
  }
}
