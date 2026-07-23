eof

```javascript:سكريبت الخلفية والمشاركة المحدث:sw.js
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const file = formData.get("shared_file");

          if (file) {
            const cache = await caches.open("shared-files-cache");
            await cache.put("/shared-file", new Response(file));
          }
        } catch (err) {
          console.error("Error holding shared file in Service Worker:", err);
        }
        return Response.redirect("/?shared=true", 303);
      })()
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
