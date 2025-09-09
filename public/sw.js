// Service Worker for PlaylistFox PWA

self.addEventListener('install', function(event) {
  console.log('Service Worker installing');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker activating');
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

// Basic fetch handler - just pass requests through to network
self.addEventListener('fetch', function(event) {
  // Don't interfere with requests, just pass them through
  event.respondWith(fetch(event.request));
});