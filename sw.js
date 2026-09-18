self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => self.clients.claim());

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.searchParams.has('shared')) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const file = formData.get('shared_file');
        
        if (file) {
          const cache = await caches.open('shared-files-cache');
          // تشفير اسم الملف لتجنب خطأ الحروف العربية في الترويسات
          const safeFileName = encodeURIComponent(file.name || 'shared_file');
          const response = new Response(file, {
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
              'X-Original-Filename': safeFileName
            }
          });
          await cache.put('/shared-file', response);
        }
      } catch (err) {
        console.error('SW Error:', err);
      }
      return Response.redirect('/?shared=true', 303);
    })());
  }
});