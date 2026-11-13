
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(process.cwd(), '..'), '')
  const token = env.HISTORY_API_TOKEN

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:3001',
        '/history-api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/history-api/, '/api'),
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              if (token) {
                proxyReq.setHeader('Authorization', `Bearer ${token}`)
              }
            })
          }
        }
      }
    }
  }
})
