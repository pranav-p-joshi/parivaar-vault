import { addIcons } from 'ionicons';
import {
  cardOutline,
  checkmarkCircle,
  documentOutline,
  documentTextOutline,
  eye,
  eyeOff,
  folderOpenOutline,
  imageOutline,
  peopleOutline,
  personOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

/** Icons referenced by name from shared components. Feature pages register their own. */
export function registerAppIcons(): void {
  addIcons({
    cardOutline,
    checkmarkCircle,
    documentOutline,
    documentTextOutline,
    // `eye` / `eyeOff` are used by `ion-input-password-toggle`, which looks them
    // up by name; without this they render blank in a standalone Ionic app.
    eye,
    eyeOff,
    folderOpenOutline,
    imageOutline,
    peopleOutline,
    personOutline,
    shieldCheckmarkOutline,
  });
}
