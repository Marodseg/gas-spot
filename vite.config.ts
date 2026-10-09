import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

const base = normalizeBase(process.env.VITE_BASE_PATH)

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Reposta — Dónde repostar',
        short_name: 'Reposta',
        description:
          'Compara precios de gasolineras cerca de ti y decide dónde merece la pena repostar.',
        lang: 'es',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f4f2ee',
        theme_color: '#0b6b5a',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.precioil\.es\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/photon\.komoot\.io\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/Canvas\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: {
                maxEntries: 180,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 4179,
  },
  preview: {
    host: '0.0.0.0',
    port: 4179,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: false,
  },
})

function normalizeBase(value: string | undefined): string {
  if (!value || value === '/') return '/'
  const withSlash = value.startsWith('/') ? value : `/${value}`
  return withSlash.endsWith('/') ? withSlash : `${withSlash}/`
}
