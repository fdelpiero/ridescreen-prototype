import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// Working product name lives in src/config.ts; the manifest repeats it because
// the build config cannot import app source.
const APP_NAME = 'RideScreen'

export default defineConfig({
  // Relative base so the built app can be served from any folder or static host.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
      manifest: {
        name: `${APP_NAME} (prototype)`,
        short_name: APP_NAME,
        description: 'In-car tablet advertising for rideshare drivers. Prototype.',
        theme_color: '#16181d',
        background_color: '#16181d',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
