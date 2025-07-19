// Service Worker for Push Notifications with Version-Aware Caching
const CACHE_VERSION = 'v2'; // Increment this on each deployment
const CACHE_NAME = `servenow-${CACHE_VERSION}`;
const STATIC_CACHE_NAME = `servenow-static-${CACHE_VERSION}`;

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...', CACHE_VERSION);
  event.waitUntil(
    Promise.all([
      // Cache static assets with version
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll([
          '/',
          '/index.html',
          '/vite.svg',
          '/version.json'
        ]);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ]).then(() => {
      console.log('[SW] Service Worker installed');
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches that don't match current version
          if (!cacheName.includes(CACHE_VERSION)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('[SW] Push data:', data);
    
    const options = {
      body: data.body || 'New task assigned!',
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: data.tag || 'servenow-notification',
      requireInteraction: false,
      silent: false,
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'ServeNow', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If there's already a window open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Background sync for offline support
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event);
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync...');
  // Add offline sync logic here if needed
}

// Fetch event - serve cached content when offline with version checking
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip version.json requests - always fetch fresh
  if (request.url.includes('/version.json')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Handle asset requests (JS, CSS, images)
  if (request.url.includes('/assets/')) {
    event.respondWith(
      caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(request).then((fetchResponse) => {
            // Cache successful asset responses
            if (fetchResponse.ok) {
              const responseClone = fetchResponse.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return fetchResponse;
          });
        })
        .catch(() => {
          // Return offline fallback for assets
          return caches.match('/');
        })
    );
    return;
  }
  
  // Handle HTML requests
  if (request.destination === 'document' || request.url.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Always fetch fresh HTML
          return response;
        })
        .catch(() => {
          // Fallback to cached version if offline
          return caches.match('/');
        })
    );
    return;
  }
  
  // Default strategy for other requests
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request);
      })
      .catch(() => {
        // Return offline page if available
        return caches.match('/');
      })
  );
});

// Message event for version checking
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
}); 