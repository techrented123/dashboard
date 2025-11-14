// Photo storage utility using IndexedDB for large base64 data
const DB_NAME = "rented123_verification";
const DB_VERSION = 1;
const STORE_NAME = "photos";

let dbInstance: IDBDatabase | null = null;

// Initialize database
const initDB = (): Promise<IDBDatabase> => {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

// Save photo to IndexedDB
export const savePhotoToIndexedDB = async (
  id: string,
  data: string
): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ id, data });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error("Error saving photo to IndexedDB:", error);
    throw error;
  }
};

// Get photo from IndexedDB
export const getPhotoFromIndexedDB = async (
  id: string
): Promise<string | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error("Error getting photo from IndexedDB:", error);
    return null;
  }
};

// Clear all photos from IndexedDB
export const clearAllPhotosFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        dbInstance = null;
        resolve();
      };
    });
  } catch (error) {
    console.error("Error clearing photos from IndexedDB:", error);
    throw error;
  }
};
