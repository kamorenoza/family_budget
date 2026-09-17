import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'iconpwa.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      manifest: {
        name: 'Family Budget',
        short_name: 'Family Budget',
        description: 'App para gestionar el presupuesto familiar',
        theme_color: '#2d7797',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'iconpwa.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconpwa.png', sizes: '512x512', type: 'image/png' },
          { src: 'iconpwa.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
