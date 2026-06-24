import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { viteStaticCopy } from 'vite-plugin-static-copy';

import manifest from './manifest.json';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    crx({ manifest }),
    viteStaticCopy({
      targets: [
        {
          src: [
            'node_modules/onnxruntime-web/dist/ort-wasm*.wasm',
            'node_modules/onnxruntime-web/dist/ort-wasm*.mjs'
          ],
          dest: 'wasm'
        }
      ]
    })
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
