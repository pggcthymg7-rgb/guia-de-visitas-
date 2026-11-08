import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('TC-07: Compatibilidade com GitHub Pages (/guia-de-visitas-/)', () => {
  const rootDir = path.resolve(__dirname, '../..');

  it('configures Vite with relative base "./", uses HashRouter in App.tsx, and includes favicon + Google Fonts in index.html', () => {
    const viteConfig = fs.readFileSync(path.join(rootDir, 'vite.config.ts'), 'utf-8');
    expect(viteConfig).toContain("base: './'");

    const appSource = fs.readFileSync(path.join(rootDir, 'src/App.tsx'), 'utf-8');
    expect(appSource).toContain('HashRouter');

    const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('href="./favicon.svg"');
    expect(indexHtml).toContain('Roboto+Slab');
    expect(indexHtml).toContain('Inter');

    const faviconExists = fs.existsSync(path.join(rootDir, 'public/favicon.svg'));
    expect(faviconExists).toBe(true);

    const workflowExists = fs.existsSync(path.join(rootDir, '.github/workflows/deploy.yml'));
    expect(workflowExists).toBe(true);
  });
});
