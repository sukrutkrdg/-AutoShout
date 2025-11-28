import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: '.', // Proje kök dizini (burada index.html aranır)
  publicDir: '../public', // Eğer public klasörü frontend dışında ise
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // Ağ üzerinden erişime izin ver (bazen localhost sorunlarını çözer)
    port: 5173,
  }
})