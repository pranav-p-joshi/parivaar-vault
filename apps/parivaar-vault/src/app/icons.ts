import { addIcons } from 'ionicons';
import {
  cardOutline,
  checkmarkCircle,
  documentOutline,
  documentTextOutline,
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
    folderOpenOutline,
    imageOutline,
    peopleOutline,
    personOutline,
    shieldCheckmarkOutline,
  });
}
