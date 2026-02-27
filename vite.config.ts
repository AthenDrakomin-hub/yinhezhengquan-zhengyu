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
        chunkSizeWarningLimit: 600, // 将警告限制调整为600kb
        rollupOptions: {
          output: {
              manualChunks(id) {
                // 将 React 及其生态系统打包到一起
                const reactEcosystem = [
                  'react',
                  'react-dom',
                  'react-router',
                  'react-router-dom',
                  'react-hook-form',
                  'scheduler',
                  'prop-types',
                  'object-assign',
                  'loose-envify'
                ];
                for (const pkg of reactEcosystem) {
                  if (id.includes(`node_modules/${pkg}/`)) {
                    return 'react-vendor';
                  }
                }
                
                // 图表库单独拆分
                if (id.includes('node_modules/recharts')) {
                  return 'chart-vendor';
                }
                // UI 动画与图标库合并
                if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react')) {
                  return 'ui-vendor';
                }
                // Supabase 客户端单独拆分
                if (id.includes('node_modules/@supabase/supabase-js')) {
                  return 'supabase-vendor';
                }
                // 其余 node_modules 归入 vendor
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