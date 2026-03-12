// Service Worker 配置
// 版本：2.0.2 - 修复无限循环问题
// 功能：离线缓存、资源预加载

const CACHE_NAME = 'zhengyu-trade-v2.0.2';
const RUNTIME_CACHE = 'zhengyu-trade-runtime-v2';

// 需要预缓存的核心资源
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.ico',
];

// 需要动态缓存的资源类型
const CACHEABLE_EXTENSIONS = [
  '.js', '.css', '.json', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'
];

// 处理 SKIP_WAITING 消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] 收到 SKIP_WAITING，立即激活');
    self.skipWaiting();
  }
});

// Service Worker 安装事件
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] 预缓存核心资源...');
      return cache.addAll(PRECACHE_URLS);
    }).catch((error) => {
      console.error('[SW] 预缓存失败:', error);
    })
  );
});

// Service Worker 激活事件 - 只清理旧版本缓存，不清理所有缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');

  event.waitUntil(
    Promise.all([
      // 立即控制所有客户端
      self.clients.claim(),
      
      // 只清理旧版本缓存，保留 runtime 缓存
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 只删除旧版本的主缓存，不删除 runtime 缓存
            if (cacheName.startsWith('zhengyu-trade-v') && cacheName !== CACHE_NAME) {
              console.log('[SW] 清理旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
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

  // 跳过 API 请求和外部资源
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('sinajs.cn') ||
    url.hostname.includes('eastmoney.com') ||
    url.hostname.includes('upstash.io')
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // 如果有缓存，直接返回
      if (cachedResponse) {
        return cachedResponse;
      }

      // 否则，发起网络请求
      return fetch(request).then((response) => {
        // 检查响应是否有效
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // 克隆响应
        const responseToCache = response.clone();

        // 判断是否需要缓存
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
        console.error('[SW] 请求失败:', error);
        
        // 网络失败时，尝试返回缓存
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // 如果是页面请求，返回离线页面
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      });
    })
  );
});

// 推送通知
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '您有新消息',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification('日斗投资单元', options)
  );
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/client/dashboard')
  );
});
