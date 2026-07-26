const CACHE_NAME = "shared-files-cache";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // التقاط طلب المشاركة
  if (event.request.method === "POST" && (url.pathname.includes("share-target") || url.pathname.endsWith("/share-target/"))) {
    event.respondWith(handleShareTarget(event));
  } else {
    event.respondWith(fetch(event.request));
  }
});

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    const file = formData.get("shared_file");

    if (file && file.size > 0) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put("/shared-file", new Response(file, {
        headers: { 
          "Content-Type": file.type || "application/octet-stream",
          "x-filename": encodeURIComponent(file.name || "ملف_مشارك")
        }
      }));
    }
  } catch (err) {
    console.error("فشل التقاط الملف المشارك:", err);
  }

  return Response.redirect("./?shared=true", 303);
}
