const CACHE_NAME = "shared-files-cache";

// تفعيل وتحديث الـ Service Worker بشكل مباشر
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // نلتقط طلبات المشاركة القادمة عبر POST على مسار share-target أو التي تعتمد المعلمة shared
  if (event.request.method === "POST" && (url.pathname.includes("share-target") || url.searchParams.has("shared"))) {
    event.respondWith(handleShareTarget(event));
  } else {
    // باقي الطلبات العادية
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    // التقاط الملف بأي حقل محتمل من التطبيقات الخارجية
    const file = formData.get("shared_file") || formData.get("file") || formData.get("image");

    if (file && file.size > 0) {
      const cache = await caches.open(CACHE_NAME);
      
      // حظر المعالجات القديمة وإنشاء الاستجابة بالحجم والتأطير الصحيح
      const fileResponse = new Response(file, {
        headers: {
          "content-type": file.type || "application/octet-stream",
          "content-length": file.size.toString(),
          "x-file-name": encodeURIComponent(file.name || "shared_file")
        }
      });

      await cache.put("/shared-file", fileResponse);
    }
  } catch (err) {
    console.error("خطأ في معالجة الملف المشارك بـ Service Worker:", err);
  }

  // التوجيه الديناميكي المتوافق مع كروم الحديث وقواعد المسارات النسبية (HTTP 303)
  const redirectUrl = new URL("./?shared=1", event.request.url).href;
  return Response.redirect(redirectUrl, 303);
}
