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
    let fileToSave = null;
    let fileName = "shared_file_" + Date.now();
    let fileType = "application/octet-stream";

    // 1. المحاولة الأولى (طريقة كروم الحديثة 154+)
    try {
      const formData = await event.request.formData();
      // البحث عن الملف بأي اسم هيدر مفترض
      fileToSave = formData.get('file') || formData.get('image') || formData.get('document');
      if (fileToSave && fileToSave instanceof File) {
        fileName = fileToSave.name || fileName;
        fileType = fileToSave.type || fileType;
      }
    } catch (e) {
      console.warn("FormData parse failed, falling back to blob/arrayBuffer...", e);
    }

    // 2. المحاولة الثانية: Fallback للإصدارات القديمة إذا فشلت الأولى
    if (!fileToSave) {
      const blob = await event.request.blob();
      if (blob && blob.size > 0) {
        fileToSave = blob;
      }
    }

    if (fileToSave) {
      const buffer = await fileToSave.arrayBuffer();
      
      // حفظ الملف في IndexedDB للتوافقية الشاملة
      const db = await openDatabase();
      const tx = db.transaction('shared_files', 'readwrite');
      await tx.objectStore('shared_files').put({
        id: 'latest_share',
        buffer: buffer,
        name: fileName,
        type: fileType,
        timestamp: Date.now()
      });
    }
  } catch (err) {
    console.error("Share handling error:", err);
  }

  // التوجيه للواجهة الرئيسية مع معلمة shared
  return Response.redirect('/index.html?shared=true', 303);
}

// فتح قاعدة البيانات بصورة آمنة
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MaktabatiShareDB', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('shared_files')) {
        db.createObjectStore('shared_files', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
