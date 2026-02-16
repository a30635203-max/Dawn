// service-worker.js - النسخة المحدثة v3
const CACHE_NAME = 'phase-cache-v3';
const urlsToCache = [
  './',
  './index.html'
];

// التثبيت وتخزين الملفات في الكاش
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  // حذف الكاش القديم فوراً
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return caches.open(CACHE_NAME)
        .then(cache => {
          console.log('Opened new cache:', CACHE_NAME);
          return cache.addAll(urlsToCache);
        });
    })
  );
  
  // تفعيل الـ Service Worker الجديد فوراً
  self.skipWaiting();
});

// تفعيل وحذف الكاش القديم وتنظيف كل شيء
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // حذف أي كاش قديم
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache in activate:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // السيطرة على جميع الصفحات المفتوحة فوراً
      self.clients.claim()
    ])
  );
});

// استراتيجية التحميل: من الكاش أولاً، مع تحديث الكاش من الشبكة
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // موجود في الكاش -> أعطه
        if (response) {
          // تحديث الكاش في الخلفية (للملفات القديمة)
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, networkResponse.clone());
                  });
              }
            })
            .catch(() => {});
          return response;
        }
        
        // غير موجود -> حمله من الشبكة
        return fetch(event.request.clone())
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // خزن النسخة في الكاش للمرة القادمة
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          })
          .catch(error => {
            console.log('Fetch failed:', error);
            return new Response('Offline page not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// التعامل مع تحديثات الـ Service Worker
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
