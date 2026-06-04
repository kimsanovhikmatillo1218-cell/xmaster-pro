import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Mobile (Capacitor iOS/Android) uchun config — base './'
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-mobile',
    target: 'es2015',
    minify: true,
  },
  server: { port: 5174 }
})
