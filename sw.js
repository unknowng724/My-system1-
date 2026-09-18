// Service Worker - يتعامل مع خاصية مشاركة الملفات (Web Share Target) والتثبيت

// v2: رفعنا رقم النسخة عمداً لإجبار كروم يحدّث الـ Service Worker فوراً
// بدل ما ينتظر دورة التحقق الاعتيادية (ممكن تاخد ساعات/أيام)
const CACHE_NAME = "shared-files-cache-v2";

self.addEventListener("install", (event) => {
  // تفعيل الـ Service Worker فوراً بدون انتظار إغلاق كل التبويبات القديمة
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // نحذف أي نسخ كاش قديمة من إصدارات سابقة (shared-files-cache بدون v2)
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("shared-files-cache") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
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
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-Original-Filename": encodeURIComponent(file.name || "")
        }
      }));
    } else {
      // وصل الطلب للـ Service Worker لكن بدون ملف فعلي داخله
      return Response.redirect("/?shareError=empty", 303);
    }
  } catch (err) {
    console.error("فشل التقاط الملف المشارك:", err);
    // نرجّع رسالة الخطأ بالرابط نفسه عشان تظهر على الشاشة بدون الحاجة لكمبيوتر
    return Response.redirect("/?shareError=" + encodeURIComponent(err.message || "unknown"), 303);
  }

  // نرجع المستخدم لصفحة التطبيق الرئيسية مع علامة ?shared=true
  return Response.redirect("/?shared=true", 303);
}
