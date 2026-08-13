import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Default targets recent browsers only. Old tablets/phones stuck on an
    // outdated OS (e.g. an iPad capped at an old iOS/Safari) can't parse
    // that output at all and just render a blank page — down-compile syntax
    // far enough that the app at least loads and shows its own error UI
    // instead of a silent crash, even on hardware this old.
    target: ['es2018', 'safari12', 'ios12'],
  },
})
