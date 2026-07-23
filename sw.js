self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

function saveSharedFileToIDB(fileObj) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("PWA_Share_DB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("shared_files")) {
        db.createObjectStore("shared_files");
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction("shared_files", "readwrite");
      const store = tx.objectStore("shared_files");
      
      const fileData = {
        blob: fileObj,
        name: fileObj.name || "shared_file_" + Date.now(),
        type: fileObj.type || "application/octet-stream",
        timestamp: Date.now()
      };
      
      store.put(fileData, "pending_shared_file");
      tx.oncomplete = () => resolve();
      tx.onerror = (err) => reject(err);
    };
    request.onerror = (err) => reject(err);
  });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && (url.pathname === "/share-target" || url.pathname.endsWith("/share-target"))) {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          let sharedFile = null;

          for (const [key, value] of formData.entries()) {
            if (value && typeof value === "object" && (value instanceof Blob || value.name)) {
              sharedFile = value;
              break;
            }
          }

          if (sharedFile) {
            await saveSharedFileToIDB(sharedFile);
          }
        } catch (err) {
          console.error("Error processing Web Share Target file:", err);
        }
        
        // استخدام الرابط المباشر الكامل لمنع التوقف الصامت في أندرويد
        return Response.redirect(url.origin + "/?shared=true", 303);
      })()
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
