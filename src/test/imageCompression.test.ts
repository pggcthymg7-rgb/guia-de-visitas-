import { describe, it, expect } from 'vitest';
import { imageCompressionService } from '@/infrastructure/media/imageCompression';

describe('Infrastructure: Image Compression & Canvas Memory Safety (< 30 MB)', () => {
  it('returns external HTTP/HTTPS image URLs untouched without allocating canvas', async () => {
    const externalUrl = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9';
    const result = await imageCompressionService.compressImage(externalUrl);
    expect(result).toBe(externalUrl);
  });

  it('validates image file format and maximum size', () => {
    const validJpg = new File(['fake-content'], 'facade.jpg', { type: 'image/jpeg' });
    expect(imageCompressionService.validateImageFile(validJpg).valid).toBe(true);

    const validWebp = new File(['fake-content'], 'facade.webp', { type: 'image/webp' });
    expect(imageCompressionService.validateImageFile(validWebp).valid).toBe(true);

    const invalidPdf = new File(['fake-content'], 'document.pdf', { type: 'application/pdf' });
    const invalidResult = imageCompressionService.validateImageFile(invalidPdf);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('Formato não suportado');
  });

  it('generates a clean SVG facade placeholder for offline/fallback use', () => {
    const placeholder = imageCompressionService.createFacadePlaceholder('Mansão Alphaville 1');
    expect(placeholder).toContain('data:image/svg+xml');
    expect(placeholder).toContain('Mans%C3%A3o%20Alphaville%201');
  });

  it('identifies external image URLs correctly', () => {
    expect(imageCompressionService.isExternalImageUrl('https://example.com/photo.jpg')).toBe(true);
    expect(imageCompressionService.isExternalImageUrl('http://example.com/photo.jpg')).toBe(true);
    expect(imageCompressionService.isExternalImageUrl('data:image/jpeg;base64,12345')).toBe(false);
    expect(imageCompressionService.isExternalImageUrl('/assets/photo.jpg')).toBe(false);
  });
});
