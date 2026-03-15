import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'Brain 2.0',
        short_name: 'Brain',
        description: 'Your personal knowledge base — tasks, milestones & notes, beautifully organised',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        start_url: './',
        scope: './',
        lang: 'en',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'icons/icon-72.png',  sizes: '72x72',   type: 'image/png' },
          { src: 'icons/icon-96.png',  sizes: '96x96',   type: 'image/png' },
          { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg',     sizes: 'any',     type: 'image/svg+xml' },
        ],
        shortcuts: [
          {
            name: 'New Entry',
            short_name: 'New',
            description: 'Add a new knowledge entry',
            url: './?action=new-entry',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'New Milestone',
            short_name: 'Milestone',
            description: 'Save a special day or anniversary',
            url: './?action=new-milestone',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Task Board',
            short_name: 'Tasks',
            description: 'View your task board',
            url: './?view=board',
            icons: [{ src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        // Allow the SW to handle larger assets
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-static-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/sheets\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'sheets-api-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/accounts\.google\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        // Enable in dev for testing
        enabled: false,
      },
    }),
  ],
  define: {
    // Injected at build time so the running app can show "which build is deployed"
    __BUILD_TIME__:   JSON.stringify(new Date().toISOString()),
    __COMMIT_SHA__:   JSON.stringify(process.env.VITE_COMMIT_SHA ?? 'dev'),
  },
  base: process.env.VITE_BASE_PATH ?? './',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          dnd:    ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          store:  ['zustand'],
          ai:     ['openai'],
        },
      },
    },
  },
})
