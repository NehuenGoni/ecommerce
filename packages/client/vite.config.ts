import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // El refresh token vive en una cookie httpOnly. Si el cliente le pega
    // directo a localhost:4000, es cross-origin y los navegadores modernos
    // descartan esa cookie por el bloqueo de cookies de terceros (verificado:
    // el header Set-Cookie del server es válido, pero el browser nunca la
    // guarda). Proxyando /api acá, todo el tráfico queda same-origin desde
    // la perspectiva del navegador — mismo mecanismo que el rewrite de
    // vercel.json en producción.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
