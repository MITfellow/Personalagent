import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Rewrites dist/sw.js with the real build id and the hashed asset list. */
function serviceWorkerManifest() {
  return {
    name: 'sw-precache-manifest',
    apply: 'build' as const,
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist');
      const swPath = resolve(dist, 'sw.js');
      const htmlPath = resolve(dist, 'index.html');
      if (!existsSync(swPath) || !existsSync(htmlPath)) return;
      const html = readFileSync(htmlPath, 'utf8');
      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
      const buildId = createHash('sha1').update(assets.join('|') + html).digest('hex').slice(0, 8);
      const sw = readFileSync(swPath, 'utf8')
        .replace('__BUILD_ID__', buildId)
        .replace("'__PRECACHE__'", assets.map((a) => JSON.stringify(a)).join(', ') || "'__PRECACHE__'");
      writeFileSync(swPath, sw);
    },
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerManifest()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    cors: true,
    hmr: { clientPort: 443, protocol: 'wss' },
  },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: {
    target: 'es2020',
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react')) return 'react';
          return undefined;
        },
      },
    },
  },
});
