// Service Worker - يتعامل مع خاصية مشاركة الملفات (Web Share Target) والتثبيت

const CACHE_NAME = "shared-files-cache";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // التقاط طلبات POST الخاصة بالمشاركة
  if (event.request.method === "POST" && url.pathname.includes("/share-target")) {
    event.respondWith(handleShareTarget(event));
  } else {
    // السماح بباقي الطلبات بالمرور بشكل طبيعي
    event.respondWith(fetch(event.request));
  }
});

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    const file = formData.get("shared_file"); // تأكد أن هذا الاسم يطابق الموجود في manifest

    if (file && file.size > 0) {
      const buffer = await file.arrayBuffer();
      const cache = await caches.open(CACHE_NAME);
      
      await cache.put("/shared-file", new Response(buffer, {
        headers: { 
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name || "shared_file")
        }
      }));
    }
  } catch (err) {
    console.error("فشل التقاط الملف المشارك:", err);
  }

  // التوجيه للصفحة الرئيسية مع معامل التأكيد
  return Response.redirect("/?shared=true", 303);
}
