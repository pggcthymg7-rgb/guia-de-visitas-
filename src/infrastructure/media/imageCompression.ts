export interface ImageCompressionOptions {
  maxWidth?: number; // Default: 1200px
  maxHeight?: number; // Default: 1200px
  quality?: number; // Default: 0.78
  mimeType?: 'image/jpeg' | 'image/webp'; // Default: 'image/jpeg'
}

export class ImageCompressionService {
  /**
   * Compresses an image file, blob, or data URL client-side.
   * STRICT WEBKIT MEMORY INVARIANT:
   * 1. Never allocate canvas larger than target max dimension (1200x1200 max = 5.76 MB).
   * 2. Immediately zero out canvas width & height after extracting data URL.
   * 3. Revoke any created object URL.
   * This guarantees canvas RAM consumption stays strictly < 30 MB (far below 384 MB Jetsam threshold).
   */
  async compressImage(
    source: File | Blob | string,
    options: ImageCompressionOptions = {}
  ): Promise<string> {
    const maxWidth = options.maxWidth ?? 1200;
    const maxHeight = options.maxHeight ?? 1200;
    const quality = options.quality ?? 0.78;
    const mimeType = options.mimeType ?? 'image/jpeg';

    // If source is already an external HTTPS URL, return directly
    if (typeof source === 'string' && (source.startsWith('http://') || source.startsWith('https://'))) {
      return source;
    }

    return new Promise((resolve, reject) => {
      let objectUrl: string | null = null;
      const img = new Image();

      const cleanup = () => {
        if (objectUrl) {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
            // ignore cleanup errors
          }
          objectUrl = null;
        }
        img.onload = null;
        img.onerror = null;
        img.src = '';
      };

      img.onload = () => {
        try {
          const origW = img.naturalWidth || img.width;
          const origH = img.naturalHeight || img.height;

          if (origW === 0 || origH === 0) {
            cleanup();
            reject(new Error('Invalid image dimensions (0x0).'));
            return;
          }

          // Calculate aspect ratio scale factor
          const scale = Math.min(1, maxWidth / origW, maxHeight / origH);
          const targetW = Math.max(1, Math.round(origW * scale));
          const targetH = Math.max(1, Math.round(origH * scale));

          // Allocate canvas strictly at target dimensions (max 1200x1200 = 5.76 MB raw RGBA memory)
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;

          const ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            cleanup();
            // Fallback for headless environments without 2D context
            resolve(typeof source === 'string' ? source : '');
            return;
          }

          // Draw scaled image
          ctx.drawImage(img, 0, 0, targetW, targetH);

          // Extract compressed data URL
          const compressedDataUrl = canvas.toDataURL(mimeType, quality);

          // IMMEDIATELY ZERO CANVAS GRAPHICS BUFFER TO PREVENT JETSAM ABORT
          canvas.width = 0;
          canvas.height = 0;
          ctx.clearRect(0, 0, 0, 0);

          cleanup();
          resolve(compressedDataUrl);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      img.onerror = () => {
        cleanup();
        reject(new Error('Falha ao processar o arquivo de imagem. Certifique-se de que é um formato válido.'));
      };

      if (typeof source === 'string') {
        img.src = source;
      } else {
        try {
          objectUrl = URL.createObjectURL(source);
          img.src = objectUrl;
        } catch (err) {
          cleanup();
          reject(err);
        }
      }
    });
  }

  validateImageFile(file: File): { valid: boolean; error?: string } {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'];
    if (!validMimes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
      return {
        valid: false,
        error: 'Formato não suportado. Por favor, envie uma foto em JPG, PNG ou WebP.',
      };
    }

    const maxSizeBytes = 25 * 1024 * 1024; // 25 MB max raw input
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: 'A imagem original é muito grande (máximo 25 MB). Escolha uma foto menor.',
      };
    }

    return { valid: true };
  }

  createFacadePlaceholder(condominiumName: string): string {
    const cleanName = condominiumName || 'Imóvel em Destaque';
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
        <rect width="1200" height="800" fill="#faf5e8"/>
        <rect x="40" y="40" width="1120" height="720" rx="16" fill="#ffffff" stroke="#e0e2e6" stroke-width="4"/>
        <g fill="#181d26" opacity="0.15" transform="translate(540, 280) scale(4)">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </g>
        <text x="600" y="480" font-family="'Roboto Slab', Georgia, serif" font-weight="900" font-size="36" fill="#040e20" text-anchor="middle">
          ${cleanName}
        </text>
        <text x="600" y="530" font-family="'Inter', sans-serif" font-weight="500" font-size="20" fill="#525965" text-anchor="middle">
          Foto da Fachada em Alta Resolução
        </text>
      </svg>
    `.trim();

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  isExternalImageUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }
}

export const imageCompressionService = new ImageCompressionService();
