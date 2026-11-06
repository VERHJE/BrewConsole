// Foto → klein WebP/JPEG in de browser (canvas). De rekenregels staan in core/photos.ts.
import { PHOTO_MAX_BYTES, PHOTO_MAX_SIDE, compressToBudget, fitWithin } from '../core/photos.ts';

export async function encodePhoto(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const { width, height } = fitWithin(bmp.width, bmp.height, PHOTO_MAX_SIDE);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, width, height);
  bmp.close?.();
  const toBlob = (type: string, q: number): Promise<Blob | null> => new Promise(r => canvas.toBlob(r, type, q));
  const webp = await toBlob('image/webp', 0.8);
  const type = webp && webp.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  return compressToBudget(async q => (await toBlob(type, q)) ?? file, PHOTO_MAX_BYTES);
}
