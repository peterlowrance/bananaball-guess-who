/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// Project site on GitHub Pages is served under /<repo>/.
const BASE = '/bananaball-guess-who/';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // App shell + assets are precached; player/team images are cross-origin
      // (no CORS headers from thebananaball.com) so they are runtime-cached as
      // opaque responses (status 0) with CacheFirst. See plan §6.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,mp3,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/thebananaball\.com\/stats\/(players|teams)\/.*\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bbgw-images',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 250, purgeOnQuotaError: true },
            },
          },
        ],
      },
      manifest: {
        name: 'Bananaball Guess Who',
        short_name: 'Guess Who',
        description: 'Learn every Banana Ball player — Duolingo-style.',
        theme_color: '#ffd23f',
        background_color: '#fff8e1',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    projects: [
      {
        test: {
          name: 'engine',
          environment: 'node',
          include: ['src/engine/**/*.test.ts', 'src/data/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
        },
      },
    ],
  },
});
