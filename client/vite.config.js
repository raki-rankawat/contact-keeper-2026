import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In Docker the API is a separate container, so the proxy target is the service
// name rather than localhost, and the bind mount needs polling to see changes.
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:5000'
const usePolling = process.env.VITE_USE_POLLING === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': apiTarget },
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
  },
})
