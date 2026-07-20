self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // عندما يقوم المستخدم بمشاركة ملف من واتساب أو الاستوديو للتطبيق
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const file = formData.get('shared_file');

        if (file) {
          // نقوم بحفظ الملف مؤقتاً في كاش المتصفح لكي يستطيع index.html قراءته
          const cache = await caches.open('shared-files-cache');
          await cache.put('/shared-file', new Response(file));
        }

        // نقوم بإعادة توجيه المستخدم لصفحة الاستمارة الرئيسية مع وسيط إضافي (?shared=true) لتعرف الصفحة أن هناك ملفاً تم مشاركته
        return Response.redirect('/?shared=true', 303);
      })()
    );
    return;
  }

  // في الحالات العادية، يتم تشغيل الطلبات بشكل طبيعي
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
