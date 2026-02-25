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
          }
        }
      },
      plugins: [react(), tailwindcss()],
      build: {
        chunkSizeWarningLimit: 1000, // 将警告限制从默认的500kb调整为1000kb
        rollupOptions: {
          output: {
            manualChunks: {
              // 将大型依赖分离到独立的chunk中
              'react-vendor': ['react', 'react-dom'],
              'supabase-vendor': ['@supabase/supabase-js'],
              'chart-vendor': ['recharts'],
              'ui-vendor': ['framer-motion', 'lucide-react']
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