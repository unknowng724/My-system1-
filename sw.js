// Service Worker - مشاركة الملفات (Web Share Target) والتثبيت

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname.replace(/\/+$/, "");

  // التقاط طلب POST الخاص بالمشاركة فقط، وباقي الطلبات تمر طبيعي
  if (event.request.method === "POST" && path === "/share-target") {
    event.respondWith(handleShareTarget(event));
  }
});

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
    store.put(record, "latest_file");
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function handleShareTarget(event) {
  try {
    const formData = await event.request.formData();
    let sharedFile = null;

    for (const value of formData.values()) {
      if (value && typeof value === "object" && value.name && value.size > 0) {
        sharedFile = value;
        break;
      }
    }

    if (sharedFile) {
      await saveSharedFileToDB(sharedFile);
      return Response.redirect("/?shared=true", 303);
    }
    return Response.redirect("/?shared_error=" + encodeURIComponent("لم يتم العثور على ملف في البيانات المرسلة"), 303);
  } catch (err) {
    console.error("فشل التقاط الملف المشارك:", err);
    return Response.redirect("/?shared_error=" + encodeURIComponent(err.message || "خطأ أثناء المعالجة"), 303);
  }
}
