// Service Worker - يتعامل مع خاصية مشاركة الملفات (Web Share Target) والتثبيت

const CACHE_NAME = "shared-files-cache";

self.addEventListener("install", (event) => {
  // تفعيل الـ Service Worker فوراً بدون انتظار إغلاق كل التبويبات القديمة
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // نلتقط فقط طلبات POST المرسلة من نظام المشاركة على المسار /share-target/
  if (event.request.method === "POST" && url.pathname === "/share-target/") {
    event.respondWith(handleShareTarget(event));
  } else {
    // الطلبات العادية لتشغيل الموقع بشكل طبيعي
    event.respondWith(fetch(event.request));
  }
});

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    const file = formData.get("shared_file");

    if (file && file.size > 0) {
      const cache = await caches.open(CACHE_NAME);
      // نخزن الملف مؤقتاً بنفس المفتاح اللي بيقرأه الكود بصفحة index.html
      await cache.put("/shared-file", new Response(file, {
        headers: { "Content-Type": file.type || "application/octet-stream" }
      }));
    }
  } catch (err) {
    console.error("فشل التقاط الملف المشارك:", err);
  }

  // نرجع المستخدم لصفحة التطبيق الرئيسية مع علامة ?shared=true
  return Response.redirect("/?shared=true", 303);
}
