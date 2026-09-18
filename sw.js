// sw.js - v3
const CACHE_NAME = "shared-files-cache-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("shared-files-cache") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// ✅ نعترض فقط طلب المشاركة - ونترك باقي الطلبات للـ browser
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname === "/share-target/") {
    event.respondWith(handleShareTarget(event));
  }
  // لا نستدعي respondWith للطلبات الأخرى
});

async function handleShareTarget(event) {
  const origin = self.location.origin;
  try {
    const formData = await event.request.formData();
    const file = formData.get("shared_file");

    if (!file || file.size === 0) {
      return Response.redirect(origin + "/?shareError=empty", 303);
    }

    const cache = await caches.open(CACHE_NAME);
    // توكن فريد لكل مشاركة لتجنب تعارض الكاش
    const token = Date.now().toString(36) + Math.random().toString(36).slice(2);

    const headers = new Headers();
    headers.set("Content-Type", file.type || "application/octet-stream");
    headers.set("X-Original-Filename", encodeURIComponent(file.name || ""));

    // ✅ تخزين بمفتاح فريد ومسار مطلق
    await cache.put(
      origin + "/shared-file-" + token,
      new Response(file, { headers })
    );

    // ✅ رابط مطلق في إعادة التوجيه
    return Response.redirect(
      origin + "/?shared=true&token=" + token,
      303
    );
  } catch (err) {
    console.error("Share target error:", err);
    return Response.redirect(
      origin + "/?shareError=" + encodeURIComponent(err.message || "unknown"),
      303
    );
  }
}
