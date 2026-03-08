// Service Worker 配置
// 版本：1.0.0
// 功能：离线缓存、资源预加载、后台同步

const CACHE_NAME = 'zhengyu-trade-v1.0.0';
const RUNTIME_CACHE = 'zhengyu-trade-runtime';

// 需要预缓存的核心资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/index.css',
  // 核心依赖 chunk
  '/assets/js/react-vendor-[hash].js',
  '/assets/js/data-vendor-[hash].js',
  '/assets/js/form-vendor-[hash].js',
  '/assets/js/query-vendor-[hash].js',
  // 图标
  '/favicon.ico',
];

// 需要动态缓存的资源类型
const CACHEABLE_EXTENSIONS = [
  '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'
];

// Service Worker 安装事件
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 安装中...');

  // 跳过等待，立即激活
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] 预缓存核心资源...');
      // 注意：实际的预缓存会在构建后替换为具体的 hash 文件名
      return cache.addAll(PRECACHE_URLS.map(url => {
        // 如果 URL 包含 [hash]，跳过（构建时需要替换）
        if (url.includes('[hash]')) {
          return null;
        }
        return url;
      }).filter(Boolean));
    }).catch((error) => {
      console.error('[Service Worker] 预缓存失败:', error);
    })
  );
});

// Service Worker 激活事件
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 激活中...');

  event.waitUntil(
    Promise.all([
      // 立即控制所有客户端
      self.clients.claim(),
      
      // 清理旧缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 保留当前版本的缓存
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[Service Worker] 清理旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Service Worker 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过 Chrome 扩展等非 HTTP 请求
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 跳过 API 请求和 Supabase 请求
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('sinajs.cn') ||
    url.hostname.includes('eastmoney.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // 1. 如果有缓存，直接返回
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. 否则，发起网络请求
      return fetch(request).then((response) => {
        // 检查响应是否有效
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // 3. 克隆响应（响应流只能使用一次）
        const responseToCache = response.clone();

        // 4. 判断是否需要缓存
        const shouldCache = CACHEABLE_EXTENSIONS.some(ext => url.pathname.endsWith(ext));

        if (shouldCache) {
          event.waitUntil(
            caches.open(RUNTIME_CACHE).then((cache) => {
              return cache.put(request, responseToCache);
            })
          );
        }

        return response;
      }).catch((error) => {
        console.error('[Service Worker] 请求失败:', error);
        
        // 5. 网络失败时，尝试返回缓存的资源
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[Service Worker] 返回离线缓存:', request.url);
            return cachedResponse;
          }
          
          // 如果是页面请求，返回离线页面
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          
          // 返回空响应
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      });
    })
  );
});

// 后台同步
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] 后台同步:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // 这里可以添加数据同步逻辑
      Promise.resolve()
    );
  }
});

// 推送通知
self.addEventListener('push', (event) => {
  console.log('[Service Worker] 收到推送通知');
  
  const options = {
    body: event.data ? event.data.text() : '您有新消息',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('证裕交易单元', options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 通知被点击');
  
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/client/dashboard')
  );
});
