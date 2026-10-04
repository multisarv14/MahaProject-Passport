import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The browser only talks to :3000; API calls are forwarded to the Fastify server.
    proxy: { '/api': 'http://localhost:4000' },
  },
})
