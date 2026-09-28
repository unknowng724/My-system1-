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

// فتح قاعدة البيانات الداخلية IndexedDB
function openShareDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("PWA_Share_DB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("shared_files")) {
        db.createObjectStore("shared_files");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// حفظ الملف في IndexedDB (الطريقة الأضمن في جميع إصدارات كروم)
async function saveSharedFileToDB(file) {
  const db = await openShareDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("shared_files", "readwrite");
    const store = tx.objectStore("shared_files");
    
    const record = {
      file: file,
      name: file.name || ("shared_file_" + Date.now()),
      type: file.type || "application/octet-stream",
      timestamp: Date.now()
    };
    
    const req = store.put(record, "latest_file");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function handleShareTarget(event) {
  try {
    // عدم استخدام .clone() إطلاقاً لتجنب خطأ كروم الجديد
    const formData = await event.request.formData();
    
    let sharedFile = null;
    
    // البحث عن الملف داخل النموذج
    for (const value of formData.values()) {
      if (value && typeof value === 'object' && value.name && value.size > 0) {
        sharedFile = value;
        break;
      }
    }

    if (sharedFile) {
      await saveSharedFileToDB(sharedFile);

      // حفظ احتياطي في الـ Cache أيضاً
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put("/shared-file-data", new Response(sharedFile));
        await cache.put("/shared-file-meta", new Response(JSON.stringify({
          name: sharedFile.name || "shared_file_" + Date.now(),
          type: sharedFile.type || "application/octet-stream"
        }), { headers: { "Content-Type": "application/json" } }));
      } catch(e) {
        console.log("Cache fallback skipped:", e);
      }

      return Response.redirect("/?shared=true", 303);
    } else {
      return Response.redirect("/?shared_error=" + encodeURIComponent("لم يتم العثور على ملف في البيانات المرسلة"), 303);
    }
  } catch (err) {
    console.error("فشل التقاط الملف المشارك:", err);
    return Response.redirect("/?shared_error=" + encodeURIComponent(err.message || "خطأ أثناء المعالجة في الخلفية"), 303);
  }
}
