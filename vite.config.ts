import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    
    return {
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        historyApiFallback: {
          rewrites: [
            { from: /^\/training-camp/, to: '/index.html' },
            { from: /^\/service/, to: '/index.html' },
            { from: /^\/admin/, to: '/index.html' },
            { from: /^\/auth/, to: '/index.html' },
            { from: /^\/client/, to: '/index.html' },
          ]
        },
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
        chunkSizeWarningLimit: 2000,
        rollupOptions: {
          external: ['postgres'], // 排除 postgres 模块（Node.js 专用）
          output: {
            manualChunks: {
              // React 核心库
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              // Supabase 和数据
              'data-vendor': ['@supabase/supabase-js'],
              // UI 库
              'ui-vendor': ['recharts', 'framer-motion', 'lucide-react'],
              // 表单和验证
              'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
              // 状态管理
              'query-vendor': ['@tanstack/react-query'],
              // OCR 和人脸识别库（仅库代码，模型运行时加载）
              'ai-libs-vendor': ['tesseract.js', 'face-api.js'],
            },
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
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