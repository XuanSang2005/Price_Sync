import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  // tanstackRouter phải đứng TRƯỚC react() — nó quét routes/ và tự sinh routeTree.gen
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
  // Prod: build thẳng vào static/ của Spring → jar phục vụ cả UI lẫn API cùng một cổng.
  // Dev vẫn dùng `npm run dev` + proxy ở trên (không đụng khối build này).
  build: {
    outDir: '../backend/src/main/resources/static',
    emptyOutDir: true,
  },
})
