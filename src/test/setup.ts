import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import 'fake-indexeddb/auto';

afterEach(() => {
  cleanup();
});

// Polyfill URL.createObjectURL & revokeObjectURL for JSDOM
if (typeof window !== 'undefined') {
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url';
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }

  // Ensure robust localStorage polyfill in Node 22/26 JSDOM environment
  if (!window.localStorage || typeof window.localStorage.getItem !== 'function') {
    class MemoryStorage implements Storage {
      private store: Record<string, string> = {};

      get length(): number {
        return Object.keys(this.store).length;
      }

      clear(): void {
        this.store = {};
      }

      getItem(key: string): string | null {
        return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
      }

      key(index: number): string | null {
        const keys = Object.keys(this.store);
        return keys[index] ?? null;
      }

      removeItem(key: string): void {
        delete this.store[key];
      }

      setItem(key: string, value: string): void {
        this.store[key] = String(value);
      }
    }

    const memoryStorage = new MemoryStorage();
    Object.defineProperty(window, 'localStorage', {
      value: memoryStorage,
      writable: true,
      configurable: true,
    });
  }
}

// Minimal Canvas 2D context mock to prevent crashes in image compression and PDF tests
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string) {
    if (contextId === '2d') {
      return {
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(4) }),
        putImageData: () => {},
        fillRect: () => {},
        clearRect: () => {},
        canvas: this,
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toDataURL = function () {
    return 'data:image/webp;base64,mockCanvasDataUrl';
  };
}
