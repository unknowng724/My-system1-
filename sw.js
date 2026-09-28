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
    // 1. استنساخ الطلب: متصفح كروم الجديد يستهلك البيانات أحياناً ويمنع قراءتها مرتين
    const req = event.request.clone();
    const formData = await req.formData();
    
    // 2. البحث الذكي: لا نعتمد على اسم محدد، بل نبحث عن أي "ملف" تم إرساله
    let sharedFile = null;
    for (const value of formData.values()) {
      if (value instanceof File && value.size > 0) {
        sharedFile = value;
        break; // بمجرد أن نجد الملف نلتقطه
      }
    }

    if (sharedFile) {
      const cache = await caches.open("shared-files-cache");
      
      // 3. حفظ البايتات النقية للملف كملف منفصل
      await cache.put("/shared-file-data", new Response(sharedFile));
      
      // 4. حفظ معلومات الملف (الاسم والنوع) كـ JSON (هذا يتجاوز كل قيود كروم على الهيدرز)
      const fileMeta = JSON.stringify({
        name: sharedFile.name || "shared_file_" + Date.now(),
        type: sharedFile.type || "application/octet-stream"
      });
      
      await cache.put("/shared-file-meta", new Response(fileMeta, {
        headers: { "Content-Type": "application/json" }
      }));
    }
  } catch (err) {
    console.error("فشل التقاط الملف المشارك:", err);
  }

  // التوجيه للصفحة الرئيسية
  return Response.redirect("/?shared=true", 303);
}
