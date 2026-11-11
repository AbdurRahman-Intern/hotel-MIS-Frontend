import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  // Set VITE_BASE=/repo-name/ when hosting under a sub-path (GitHub Pages project sites).
  base: process.env.VITE_BASE ?? '/hotel-MIS-Frontend',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 5173 },
})
