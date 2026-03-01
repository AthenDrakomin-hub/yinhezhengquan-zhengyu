import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/stock': {
            target: 'https://hq.sinajs.cn',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/stock/, ''),
          },
          '/api/sina/ipo': {
            target: 'http://vip.stock.finance.sina.com.cn',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/sina\/ipo/, '/quotes_service/api/json_v2.php/Market_Center.getIPOSearchList'),
          }
        }
      },
      plugins: [react(), tailwindcss()],
      build: {
        chunkSizeWarningLimit: 2000,
      },
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});