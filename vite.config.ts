import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';

import manifest from './manifest.json';
import { resolve } from 'path';
import fs from 'fs';

/**
 * Chrome extension offscreen docs are not cross-origin isolated, so ONNX Runtime
 * must use the asyncify (single-threaded) WASM backend — not the threaded build.
 */
const ONNX_WASM_FILES = [
  'ort-wasm-simd-threaded.asyncify.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs',
] as const;

function wasmPlugin() {
  return {
    name: 'wasm-plugin',
    configureServer(server: any) {
      server.middlewares.use('/wasm', (req: any, res: any, next: any) => {
        if (req.url) {
          const fileName = req.url.split('?')[0].replace(/^\//, '');
          if (!ONNX_WASM_FILES.includes(fileName as (typeof ONNX_WASM_FILES)[number])) {
            next();
            return;
          }
          const filePath = resolve(__dirname, 'node_modules/onnxruntime-web/dist', fileName);
          if (fs.existsSync(filePath)) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            if (filePath.endsWith('.wasm')) res.setHeader('Content-Type', 'application/wasm');
            if (filePath.endsWith('.mjs')) res.setHeader('Content-Type', 'application/javascript');
            res.end(fs.readFileSync(filePath));
            return;
          }
        }
        next();
      });
    },
    writeBundle() {
      const srcDir = resolve(__dirname, 'node_modules/onnxruntime-web/dist');
      const destDir = resolve(__dirname, 'dist/wasm');
      if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
      fs.mkdirSync(destDir, { recursive: true });

      if (fs.existsSync(srcDir)) {
        for (const file of ONNX_WASM_FILES) {
          const src = resolve(srcDir, file);
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, resolve(destDir, file));
          }
        }
      }

      slimDistBundle(resolve(__dirname, 'dist'));
    },
  };
}

function slimDistBundle(distDir: string) {
  const assetsDir = resolve(distDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    for (const file of fs.readdirSync(assetsDir)) {
      const fullPath = resolve(assetsDir, file);
      if (!fs.statSync(fullPath).isFile()) continue;

      if (file.includes('ort-wasm') && (file.endsWith('.wasm') || file.endsWith('.mjs'))) {
        fs.unlinkSync(fullPath);
      }
      if (/^arcrawls-gif\d*\.gif$/i.test(file)) {
        fs.unlinkSync(fullPath);
      }
    }
  }

  // Remove duplicate macOS Finder copy files across dist (e.g., " 2", " 3", " 4")
  const removeDuplicates = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
      const fullPath = resolve(dir, item);
      if (/\s\d+(\.[a-z0-9]+)?$/i.test(item) || item.includes(' 2') || item.includes(' 3') || item.includes(' 4')) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        continue;
      }
      if (fs.statSync(fullPath).isDirectory()) {
        removeDuplicates(fullPath);
      }
    }
  };

  removeDuplicates(distDir);
}

export default defineConfig({
  plugins: [
    crx({ manifest }),
    wasmPlugin(),
  ],
  build: {
    emptyOutDir: true,
    modulePreload: false,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main_world: resolve(__dirname, 'src/content/main_world.ts'),
        offscreen: resolve(__dirname, 'src/offscreen/offscreen.html'),
        onboarding: resolve(__dirname, 'onboarding/onboarding.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'main_world') {
            return 'main_world.js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
      external: ['fs', 'path', 'url', 'sharp', 'onnxruntime-node'],
    },
  },
});