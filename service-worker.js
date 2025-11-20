const CACHE_VERSION = 'v1.0.3';
const STATIC_CACHE = `dreamfm-static-${CACHE_VERSION}`;
const AUDIO_CACHE = `dreamfm-audio-${CACHE_VERSION}`;
const RUNTIME_CACHE = `dreamfm-runtime-${CACHE_VERSION}`;

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/style.css',
  '/app.js',
  '/player.js',
  '/auth.js',
  '/config.js',
  '/pwa-install.js',
  '/manifest.json'
];

// ===================================
// INSTALL - Cache static assets
// ===================================
self.addEventListener('install', (event) => {
  console.log('🔧 [SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 [SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('❌ [SW] Cache failed:', error);
      })
  );
  
  self.skipWaiting();
});

// ===================================
// ACTIVATE - Clean old caches
// ===================================
self.addEventListener('activate', (event) => {
  console.log('✅ [SW] Service Worker Activated');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== AUDIO_CACHE && 
              cacheName !== RUNTIME_CACHE) {
            console.log('🗑️ [SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  return self.clients.claim();
});

// ===================================
// FETCH - Handle all requests
// ===================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 🎵 AUDIO FILES - Secure Streaming with Cache
  if (url.hostname.includes('workers.dev') || 
      url.pathname.endsWith('.mp3') || 
      url.pathname.endsWith('.m4a')) {
    event.respondWith(handleAudioRequest(request));
    return;
  }
  
  // 📄 STATIC FILES - Cache First
  if (STATIC_ASSETS.some(asset => url.pathname === asset)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // 🔥 FIREBASE/API - Network First
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('firestore') ||
      url.hostname.includes('googleapis')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }
  
  // 🌐 DEFAULT - Network with cache fallback
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

// ===================================
// 🔒 SECURE AUDIO CACHING
// ===================================
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  
  try {
    // Try cache first
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('🎵 [SW] Serving audio from cache:', request.url);
      return cachedResponse;
    }
    
    // Fetch from network
    console.log('📡 [SW] Fetching audio from network...');
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // Clone for caching
      const responseClone = networkResponse.clone();
      
      // Cache the audio
      await cache.put(request, responseClone);
      console.log('✅ [SW] Audio cached successfully');
      
      // Limit cache size
      await limitCacheSize(cache, 50); // Max 50 audio files
      
      return networkResponse;
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('❌ [SW] Audio fetch failed:', error);
    
    // Try to return cached version
    const cachedFallback = await cache.match(request);
    if (cachedFallback) {
      console.log('📦 [SW] Returning cached audio (offline)');
      return cachedFallback;
    }
    
    // Return error response
    return new Response(
      JSON.stringify({ error: 'Audio not available offline' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ===================================
// Cache First Strategy
// ===================================
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('📦 [SW] Serving from cache:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('❌ [SW] Fetch failed:', error);
    return new Response('Offline - Content not available');
  }
}

// ===================================
// Network First Strategy
// ===================================
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('📦 [SW] Network failed, trying cache...');
    const cached = await cache.match(request);
    return cached || new Response('Offline - Content not available');
  }
}

// ===================================
// Limit Cache Size
// ===================================
async function limitCacheSize(cache, maxItems) {
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    console.log(`🗑️ [SW] Cache limit reached (${keys.length}/${maxItems})`);
    // Delete oldest items
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
      console.log('🗑️ [SW] Deleted:', keys[i].url);
    }
  }
}

// ===================================
// Message Handler
// ===================================
self.addEventListener('message', (event) => {
  console.log('📨 [SW] Message received:', event.data);
  
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data === 'CLEAR_AUDIO_CACHE') {
    caches.delete(AUDIO_CACHE).then(() => {
      console.log('🗑️ [SW] Audio cache cleared');
      event.ports[0]?.postMessage({ success: true });
    });
  }
  
  if (event.data === 'CLEAR_ALL_CACHE') {
    caches.keys().then((names) => {
      return Promise.all(
        names.map(name => caches.delete(name))
      );
    }).then(() => {
      console.log('🗑️ [SW] All caches cleared');
      event.ports[0]?.postMessage({ success: true });
    });
  }
});

console.log('🎧 [SW] Service Worker Script Loaded');
