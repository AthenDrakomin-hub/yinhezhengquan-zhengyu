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
        rollupOptions: {
          output: {
              manualChunks(id) {
                if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) {
                  return 'react-vendor';
                }
                if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
                  return 'chart-vendor';
                }
                if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react')) {
                  return 'ui-vendor';
                }
                if (id.includes('node_modules/@supabase')) {
                  return 'supabase-vendor';
                }
                if (id.includes('node_modules')) {
                  return 'vendor';
                }
              }
          }
        }
      },
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});