import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('react-router-dom')) return 'router'
          if (id.includes('react-dom') || id.includes('\\react\\') || id.includes('/react/')) return 'react'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('recharts')) return 'charts'
          if (id.includes('date-fns')) return 'dates'
        },
      },
    },
  },
})
