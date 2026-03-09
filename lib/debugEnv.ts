// 环境变量调试工具
// 在浏览器控制台运行这个查看实际加载的环境变量

export function debugEnv() {
  console.log('=== 环境变量调试 ===');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('VITE_STORAGE_BUCKET:', import.meta.env.VITE_STORAGE_BUCKET);
  console.log('VITE_JOIN_US_BG:', import.meta.env.VITE_JOIN_US_BG);
  console.log('VITE_LOGO_URL:', import.meta.env.VITE_LOGO_URL);
  console.log('===================');
  
  // 检查实际使用的 JOIN_US_BG 值
  const JOIN_US_BG = import.meta.env.VITE_JOIN_US_BG || 'fallback-used';
  console.log('实际使用的 JOIN_US_BG:', JOIN_US_BG);
  
  // 检查图片元素
  const images = document.querySelectorAll('img');
  console.log('页面图片元素:');
  images.forEach((img, i) => {
    console.log(`${i}: ${img.src}`);
  });
}

// 使用方式：
// 1. 打开浏览器控制台 (F12)
// 2. 粘贴以下代码并回车：
/*
import('/src/lib/debugEnv.ts').then(m => m.debugEnv())
*/
