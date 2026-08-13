import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Vite's normal output is a <script type="module">, which very old
    // Safari (pre-iOS 10.3) can't even load — the browser just skips the
    // script entirely and nothing runs, JS error handling included. This
    // plugin adds a second, classic-script build (with polyfills) that
    // those browsers fall back to automatically.
    legacy({
      targets: ['defaults', 'iOS >= 9', 'Safari >= 9'],
    }),
  ],
})
