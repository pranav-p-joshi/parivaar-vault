import { Pipe, type PipeTransform } from '@angular/core';
import { docTypeDef, type DocType } from '@pranav/shared-models';

/** Masks an ID number per document type: `XXXX XXXX 1234`, `ABCDEXXXXF`, … */
@Pipe({ name: 'maskNumber' })
export class MaskNumberPipe implements PipeTransform {
  transform(value: string | undefined | null, type: DocType = 'other'): string {
    if (!value) return '';
    return docTypeDef(type).mask(value);
  }
}
