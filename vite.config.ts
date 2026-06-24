import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';

import manifest from './manifest.json';
import { resolve } from 'path';
import fs from 'fs';

function wasmPlugin() {
  return {
    name: 'wasm-plugin',
    configureServer(server: any) {
      server.middlewares.use('/wasm', (req: any, res: any, next: any) => {
        if (req.url) {
          const fileName = req.url.split('?')[0].replace(/^\//, '');
          const filePath = resolve(__dirname, 'node_modules/onnxruntime-web/dist', fileName);
          if (fs.existsSync(filePath)) {
            if (filePath.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm');
            if (filePath.endsWith('.mjs')) res.setHeader('Content-Type', 'application/javascript');
            res.end(fs.readFileSync(filePath));
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      const srcDir = resolve(__dirname, 'node_modules/onnxruntime-web/dist');
      const destDir = resolve(__dirname, 'dist/wasm');
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      if (fs.existsSync(srcDir)) {
        const files = fs.readdirSync(srcDir);
        for (const file of files) {
          if (file.startsWith('ort-wasm') && (file.endsWith('.wasm') || file.endsWith('.mjs'))) {
            fs.copyFileSync(resolve(srcDir, file), resolve(destDir, file));
          }
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [
    crx({ manifest }),
    wasmPlugin()
  ],
  build: {
    modulePreload: false,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main_world: resolve(__dirname, 'main_world.ts'),
        offscreen: resolve(__dirname, 'offscreen.html'),
        onboarding: resolve(__dirname, 'onboarding/onboarding.html')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'main_world') {
            return 'main_world.js';
          }
          return 'assets/[name]-[hash].js';
        }
      },
      external: ['fs', 'path', 'url', 'sharp', 'onnxruntime-node'],
    }
  }
});
