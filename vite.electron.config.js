import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Electron uchun alohida config — base './' (local fayl yuklash)
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-electron',
  },
  server: { port: 5174 }
})
