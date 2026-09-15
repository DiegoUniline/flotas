import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FLOTAA — Gestión de flotas',
        short_name: 'FLOTAA',
        description: 'Gestión de flotas, pedidos y operadores.',
        lang: 'es-MX',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#863bff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // La app es una SPA: cualquier ruta que no matchee un asset cacheado
        // debe caer en index.html (offline incluido), para que abrir
        // /mis-pedidos o /pedidos/:id sin conexión siga cargando el shell de
        // React en vez de un error de red del navegador.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // Lecturas a Supabase (PostgREST + Storage): stale-while-revalidate
            // — se sirve de caché al instante (incluido sin conexión) y se
            // refresca en segundo plano si hay red. Los `insert`/`update`/
            // `delete` son POST/PATCH/DELETE, Workbox nunca los cachea (solo
            // intercepta GET por defecto), así que esto es solo para lecturas.
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/rest/v1/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-rest',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org') || url.hostname.endsWith('arcgisonline.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
        ],
      },
      devOptions: {
        // Permite probar el service worker en `npm run dev` sin tener que
        // hacer build cada vez — el proyecto no tenía service worker antes,
        // así que sin esto sería imposible verificar el offline en local.
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
